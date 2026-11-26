<div class="container">
    <h1>{{ $apiDocument->data->attributes->title }}</h1>

    <div>
        @foreach ($posts as $post)
            <article>
                @php $user = ! empty($post->relationships->user->data) ? $getResource($post->relationships->user->data) : null; @endphp
                <div class="PostUser"><h3 class="PostUser-name">{{ $user ? $user->attributes->displayName : $translator->trans('core.lib.username.deleted_text') }}</h3></div>
                <div class="Post-body">
                    {!! $post->attributes->contentHtml !!}
                </div>
            </article>

            <hr>
        @endforeach
    </div>

    @if ($hasPrevPage)
        <a href="{{ $url(['page' => $page - 1]) }}">&laquo; {{ $translator->trans('core.views.discussion.previous_page_button') }}</a>
    @endif

    @if ($hasNextPage)
        <a href="{{ $url(['page' => $page + 1]) }}">{{ $translator->trans('core.views.discussion.next_page_button') }} &raquo;</a>
    @endif

    @php $relatedDiscussions = $apiDocument->data->attributes->relatedDiscussions ?? []; @endphp
    @if (! empty($relatedDiscussions))
        <section class="NeoRelatedDiscussions-ssr" aria-label="Related Discussions">
            <h2>Related Discussions</h2>
            <ul>
                @foreach ($relatedDiscussions as $rel)
                    @if (! empty($rel->url) && ! empty($rel->title))
                        <li><a href="{{ $rel->url }}">{{ $rel->title }}</a></li>
                    @endif
                @endforeach
            </ul>
        </section>
    @endif
</div>
