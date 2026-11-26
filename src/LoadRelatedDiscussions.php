<?php

namespace NeoTiler\DrawerTags;

use Flarum\Api\Controller\ShowDiscussionController;
use Flarum\Discussion\Discussion;
use Flarum\Http\RequestUtil;
use Flarum\Http\UrlGenerator;
use Illuminate\Database\ConnectionInterface;
use Psr\Http\Message\ServerRequestInterface;
use Tobscure\JsonApi\Document;

class LoadRelatedDiscussions
{
    /** @var ConnectionInterface */
    protected $db;

    /** @var UrlGenerator */
    protected $url;

    /** Broad umbrella tags receive minimal weight so topical tags dominate */
    private const BROAD_TAG_SLUGS = [
        'announcements' => 1,
        'general' => 1,
        'dev-talk' => 3,
    ];

    /** Common English/forum stopwords excluded from title entity matching */
    private const TITLE_STOPWORDS = [
        'the', 'and', 'for', 'with', 'from', 'that', 'this', 'what', 'why', 'how',
        'when', 'where', 'who', 'which', 'are', 'was', 'were', 'will', 'would',
        'can', 'could', 'should', 'have', 'has', 'had', 'not', 'but', 'you', 'your',
        'our', 'out', 'off', 'all', 'any', 'new', 'now', 'yet', 'more', 'most',
        'less', 'into', 'over', 'after', 'before', 'about', 'just', 'still', 'only',
        'real', 'best', 'good', 'worth', 'test', 'tested', 'guide', 'fix', 'fixes',
        'update', 'vs', 'pro', 'max', 'plus', 'ultra', 'free', 'live', 'official',
        '2025', '2026', '2027', '2028', 'here', 'there', 'than', 'they', 'their',
        'been', 'being', 'does', 'did', 'getting', 'using', 'make', 'makes', 'made',
    ];

    /** Short 2-char tech tokens worth keeping in title matching */
    private const SHORT_TECH_TOKENS = [
        'm1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'ai', 'os', 'pc', 'ui',
    ];

    public function __construct(ConnectionInterface $db, UrlGenerator $url)
    {
        $this->db = $db;
        $this->url = $url;
    }

    /**
     * Extract meaningful lowercase entity/topic tokens from a discussion title.
     *
     * @return array<string, true>
     */
    private function extractTitleTokens(string $title): array
    {
        $clean = strtolower($title);
        $parts = preg_split('/[^a-z0-9]+/', $clean, -1, PREG_SPLIT_NO_EMPTY) ?: [];
        $stop = array_flip(self::TITLE_STOPWORDS);
        $shortOk = array_flip(self::SHORT_TECH_TOKENS);

        $tokens = [];
        foreach ($parts as $tok) {
            if (isset($stop[$tok])) {
                continue;
            }
            if (strlen($tok) >= 3 || isset($shortOk[$tok])) {
                if (! ctype_digit($tok)) {
                    $tokens[$tok] = true;
                }
            }
        }

        return $tokens;
    }

    /**
     * Populate related discussions only on single discussion detail requests
     * (ShowDiscussionController), keeping list/index endpoints zero-overhead.
     *
     * @param ShowDiscussionController $controller
     * @param mixed $data
     * @param ServerRequestInterface $request
     * @param Document $document
     */
    public function __invoke($controller, $data, ServerRequestInterface $request, Document $document): void
    {
        if (! ($data instanceof Discussion) || ! $data->exists) {
            return;
        }

        try {
            $actor = RequestUtil::getActor($request);
            $currentId = (int) $data->id;
            $currentTokens = $this->extractTitleTokens((string) $data->title);

            // Load current discussion's tags with hierarchy and slug for 3-tier weighting
            $currentTags = $this->db->table('discussion_tag as dt')
                ->join('tags as t', 't.id', '=', 'dt.tag_id')
                ->where('dt.discussion_id', $currentId)
                ->get(['t.id', 't.slug', 't.parent_id']);

            $tagWeights = [];
            foreach ($currentTags as $t) {
                $tId = (int) $t->id;
                $slug = (string) $t->slug;
                if ($t->parent_id !== null) {
                    // Specific child tags (e.g., ai-focus, macos-swift-dev, local-llm-self-hosting)
                    $tagWeights[$tId] = 12;
                } elseif (isset(self::BROAD_TAG_SLUGS[$slug])) {
                    // Umbrella tags (announcements, general, dev-talk)
                    $tagWeights[$tId] = self::BROAD_TAG_SLUGS[$slug];
                } else {
                    // Focused primary tags (hardware, support-feedback, mobile-devices, games, showcase, rumors-leaks)
                    $tagWeights[$tId] = 6;
                }
            }

            $allTagIds = array_keys($tagWeights);
            $limit = 5;
            $orderedIds = [];

            $scores = [];

            if (! empty($allTagIds)) {
                $tagMatches = $this->db->table('discussion_tag as dt')
                    ->join('discussions as d', 'd.id', '=', 'dt.discussion_id')
                    ->whereIn('dt.tag_id', $allTagIds)
                    ->where('d.id', '!=', $currentId)
                    ->where('d.is_private', 0)
                    ->whereNull('d.hidden_at')
                    ->whereRaw("NOT EXISTS (SELECT 1 FROM seo_meta WHERE seo_meta.object_type = 'discussions' AND seo_meta.object_id = d.id AND seo_meta.robots_noindex = 1)")
                    ->get(['d.id', 'd.title', 'dt.tag_id', 'd.last_posted_at', 'd.comment_count']);

                foreach ($tagMatches as $row) {
                    $dId = (int) $row->id;
                    $weight = $tagWeights[(int) $row->tag_id] ?? 2;
                    if (! isset($scores[$dId])) {
                        $kwBonus = 0;
                        if (! empty($currentTokens)) {
                            $candTokens = $this->extractTitleTokens((string) ($row->title ?? ''));
                            $overlap = count(array_intersect_key($currentTokens, $candTokens));
                            $kwBonus = min(12, $overlap * 3);
                        }
                        $scores[$dId] = [
                            'score' => $kwBonus,
                            'last_posted_at' => (string) ($row->last_posted_at ?? ''),
                            'comment_count' => (int) ($row->comment_count ?? 0),
                        ];
                    }
                    $scores[$dId]['score'] += $weight;
                }
            }

            // Entity-adjacent boost: include recent public discussions sharing >= 2 title entities
            if (! empty($currentTokens)) {
                $recentCandidates = $this->db->table('discussions as d')
                    ->where('d.id', '!=', $currentId)
                    ->where('d.is_private', 0)
                    ->whereNull('d.hidden_at')
                    ->whereRaw("NOT EXISTS (SELECT 1 FROM seo_meta WHERE seo_meta.object_type = 'discussions' AND seo_meta.object_id = d.id AND seo_meta.robots_noindex = 1)")
                    ->orderByDesc('d.last_posted_at')
                    ->limit(200)
                    ->get(['d.id', 'd.title', 'd.last_posted_at', 'd.comment_count']);

                foreach ($recentCandidates as $rc) {
                    $dId = (int) $rc->id;
                    if (isset($scores[$dId])) {
                        continue;
                    }
                    $candTokens = $this->extractTitleTokens((string) ($rc->title ?? ''));
                    $overlap = count(array_intersect_key($currentTokens, $candTokens));
                    if ($overlap >= 2) {
                        $scores[$dId] = [
                            'score' => min(12, $overlap * 3),
                            'last_posted_at' => (string) ($rc->last_posted_at ?? ''),
                            'comment_count' => (int) ($rc->comment_count ?? 0),
                        ];
                    }
                }
            }

            if (! empty($scores)) {

                uasort($scores, static function (array $a, array $b): int {
                    if ($a['score'] !== $b['score']) {
                        return $b['score'] <=> $a['score'];
                    }
                    if ($a['last_posted_at'] !== $b['last_posted_at']) {
                        return strcmp($b['last_posted_at'], $a['last_posted_at']);
                    }
                    return $b['comment_count'] <=> $a['comment_count'];
                });

                // Over-fetch slightly so visibility filtering still leaves $limit items
                $candidateIds = array_slice(array_keys($scores), 0, 15);
                if (! empty($candidateIds)) {
                    $visible = Discussion::query()
                        ->whereVisibleTo($actor)
                        ->whereIn('id', $candidateIds)
                        ->where('is_private', 0)
                        ->whereNull('hidden_at')
                        ->get(['id', 'title', 'slug', 'comment_count', 'last_posted_at', 'created_at'])
                        ->keyBy('id');

                    foreach ($candidateIds as $cid) {
                        if ($visible->has($cid)) {
                            $orderedIds[] = $visible->get($cid);
                            if (count($orderedIds) >= $limit) {
                                break;
                            }
                        }
                    }
                }
            }

            // Fallback: top up with freshest visible public discussions if < 5 matches
            if (count($orderedIds) < $limit) {
                $excludeIds = array_merge([$currentId], array_map(static fn ($d) => (int) $d->id, $orderedIds));
                $needed = $limit - count($orderedIds);

                $fallback = Discussion::query()
                    ->whereVisibleTo($actor)
                    ->whereNotIn('id', $excludeIds)
                    ->where('is_private', 0)
                    ->whereNull('hidden_at')
                    ->whereRaw("NOT EXISTS (SELECT 1 FROM seo_meta WHERE seo_meta.object_type = 'discussions' AND seo_meta.object_id = discussions.id AND seo_meta.robots_noindex = 1)")
                    ->orderByDesc('last_posted_at')
                    ->limit($needed)
                    ->get(['id', 'title', 'slug', 'comment_count', 'last_posted_at', 'created_at']);

                foreach ($fallback as $fb) {
                    $orderedIds[] = $fb;
                }
            }

            if (empty($orderedIds)) {
                $data->neoRelatedDiscussions = [];
                return;
            }

            $finalIds = array_map(static fn ($d) => (int) $d->id, $orderedIds);
            $tagRows = $this->db->table('discussion_tag as dt')
                ->join('tags as t', 't.id', '=', 'dt.tag_id')
                ->whereIn('dt.discussion_id', $finalIds)
                ->orderByRaw('CASE WHEN t.parent_id IS NULL THEN 0 ELSE 1 END')
                ->orderBy('t.position')
                ->get(['dt.discussion_id', 't.name', 't.slug', 't.color', 't.icon', 't.parent_id']);

            $tagsByDisc = [];
            foreach ($tagRows as $tr) {
                $dId = (int) $tr->discussion_id;
                if (! isset($tagsByDisc[$dId])) {
                    $tagsByDisc[$dId] = [];
                }
                if (count($tagsByDisc[$dId]) < 2) {
                    $tagsByDisc[$dId][] = [
                        'name' => (string) $tr->name,
                        'slug' => (string) $tr->slug,
                        'color' => (string) ($tr->color ?? ''),
                        'icon' => (string) ($tr->icon ?? ''),
                        'isChild' => $tr->parent_id !== null,
                    ];
                }
            }

            $result = [];
            foreach ($orderedIds as $disc) {
                $dId = (int) $disc->id;
                $slugPart = $disc->slug ? ($dId . '-' . $disc->slug) : (string) $dId;
                $lastDate = $disc->last_posted_at ?: $disc->created_at;
                $result[] = [
                    'id' => (string) $dId,
                    'slug' => $slugPart,
                    'url' => $this->url->to('forum')->route('discussion', ['id' => $slugPart]),
                    'title' => (string) $disc->title,
                    'commentCount' => max(0, (int) $disc->comment_count),
                    'lastPostedAt' => $lastDate ? $lastDate->toIso8601String() : null,
                    'tags' => $tagsByDisc[$dId] ?? [],
                ];
            }

            $data->neoRelatedDiscussions = $result;
        } catch (\Throwable $e) {
            // Never break discussion rendering if related lookup fails
            $data->neoRelatedDiscussions = [];
        }
    }
}
