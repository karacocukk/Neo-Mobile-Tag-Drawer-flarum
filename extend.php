<?php

require_once __DIR__.'/src/LoadRelatedDiscussions.php';
require_once __DIR__.'/src/AddRelatedDiscussionsAttribute.php';

use Flarum\Api\Controller\ShowDiscussionController;
use Flarum\Api\Serializer\DiscussionSerializer;
use Flarum\Extend;
use NeoTiler\DrawerTags\AddRelatedDiscussionsAttribute;
use NeoTiler\DrawerTags\LoadRelatedDiscussions;

return [
    (new Extend\Frontend('forum'))
        ->js(__DIR__.'/js/dist/forum.js')
        ->css(__DIR__.'/less/forum.less'),

    (new Extend\ApiController(ShowDiscussionController::class))
        ->prepareDataForSerialization(LoadRelatedDiscussions::class),

    (new Extend\ApiSerializer(DiscussionSerializer::class))
        ->attributes(AddRelatedDiscussionsAttribute::class),
];
