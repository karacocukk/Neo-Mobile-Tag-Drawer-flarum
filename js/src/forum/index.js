import app from 'flarum/forum/app';
import { extend } from 'flarum/common/extend';
import HeaderSecondary from 'flarum/forum/components/HeaderSecondary';
import LinkButton from 'flarum/common/components/LinkButton';
import Separator from 'flarum/common/components/Separator';

app.initializers.add('neotiler/flarum-drawer-tags', () => {
  
  extend(HeaderSecondary.prototype, 'items', function (items) {
    try {
      const tags = app.store.all('tags');

      if (!tags || tags.length === 0) return;

      const sortedTags = tags
        .filter(tag => tag.position() !== null && !tag.isChild())
        .sort((a, b) => a.position() - b.position());

      // "All Discussions" — same style as native items
      items.add(
        'drawerAllDiscussions',
        <LinkButton
          icon="far fa-comments fa-fw"
          href={app.route('index')}
          className="Button Button--link"
          itemClassName="drawer-only-li"
        >
          {app.translator.trans('core.forum.index.all_discussions_link')}
        </LinkButton>,
        29
      );

      // Each tag — using Flarum's native icon prop (no custom HTML)
      sortedTags.forEach((tag, index) => {
        const color = tag.color();
        const baseIcon = tag.icon() || 'fas fa-tag';
        const icon = baseIcon + ' fa-fw';

        items.add(
          'drawerTag' + tag.id(),
          <LinkButton
            href={app.route('tag', { tags: tag.slug() })}
            icon={icon}
            className="Button Button--link drawer-tag-btn"
            itemClassName="drawer-only-li"
            style={color ? { '--tag-color': color } : {}}
          >
            {tag.name()}
          </LinkButton>,
          28 - index
        );
      });

      // Separator after tags
      items.add(
        'drawerTagsSeparator',
        <Separator itemClassName="drawer-only-li" />,
        28 - sortedTags.length
      );
    } catch (e) {
      console.warn('[drawer-tags] Could not load tags into drawer:', e);
    }
  });

  // Make the mobile logo clickable to return to home
  document.addEventListener('click', function(e) {
    if (window.innerWidth <= 768 && e.target.closest('.App-titleControl')) {
      e.preventDefault();
      m.route.set(app.route('index'));
    }
  });
});
