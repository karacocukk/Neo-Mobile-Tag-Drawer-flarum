<?php

namespace NeoTiler\DrawerTags;

use Flarum\Api\Controller\ShowDiscussionController;
use Flarum\Discussion\Discussion;
use Flarum\Http\RequestUtil;
use Illuminate\Database\ConnectionInterface;
use Psr\Http\Message\ServerRequestInterface;
use Tobscure\JsonApi\Document;

class LoadRelatedDiscussions
{
    /** @var ConnectionInterface */
    protected $db;

    public function __construct(ConnectionInterface $db)
    {
        $this->db = $db;
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

            // Load current discussion's tags (distinguishing child tags vs primary tags)
            $currentTags = $this->db->table('discussion_tag as dt')
                ->join('tags as t', 't.id', '=', 'dt.tag_id')
                ->where('dt.discussion_id', $currentId)
                ->get(['t.id', 't.parent_id']);

            $childTagIds = [];
            $primaryTagIds = [];
            foreach ($currentTags as $t) {
                if ($t->parent_id !== null) {
                    $childTagIds[] = (int) $t->id;
                } else {
                    $primaryTagIds[] = (int) $t->id;
                }
            }

            $allTagIds = array_values(array_unique(array_merge($childTagIds, $primaryTagIds)));
            $limit = 5;
            $orderedIds = [];

            if (! empty($allTagIds)) {
                $childSet = array_flip($childTagIds);

                // Find candidate discussions sharing at least one tag
                $tagMatches = $this->db->table('discussion_tag as dt')
                    ->join('discussions as d', 'd.id', '=', 'dt.discussion_id')
                    ->whereIn('dt.tag_id', $allTagIds)
                    ->where('d.id', '!=', $currentId)
                    ->where('d.is_private', 0)
                    ->whereNull('d.hidden_at')
                    ->whereRaw("NOT EXISTS (SELECT 1 FROM seo_meta WHERE seo_meta.object_type = 'discussions' AND seo_meta.object_id = d.id AND seo_meta.robots_noindex = 1)")
                    ->get(['d.id', 'dt.tag_id', 'd.last_posted_at', 'd.comment_count']);

                $scores = [];
                foreach ($tagMatches as $row) {
                    $dId = (int) $row->id;
                    $weight = isset($childSet[(int) $row->tag_id]) ? 10 : 4;
                    if (! isset($scores[$dId])) {
                        $scores[$dId] = [
                            'score' => 0,
                            'last_posted_at' => (string) ($row->last_posted_at ?? ''),
                            'comment_count' => (int) ($row->comment_count ?? 0),
                        ];
                    }
                    $scores[$dId]['score'] += $weight;
                }

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
