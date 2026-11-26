<?php

namespace NeoTiler\DrawerTags;

use Flarum\Api\Serializer\DiscussionSerializer;
use Flarum\Discussion\Discussion;

class AddRelatedDiscussionsAttribute
{
    public function __invoke(DiscussionSerializer $serializer, Discussion $discussion, array $attributes): array
    {
        if (isset($discussion->neoRelatedDiscussions)) {
            $attributes['relatedDiscussions'] = $discussion->neoRelatedDiscussions;
        }

        return $attributes;
    }
}
