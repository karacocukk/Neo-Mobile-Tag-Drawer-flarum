import app from 'flarum/forum/app';
import { extend } from 'flarum/common/extend';
import HeaderSecondary from 'flarum/forum/components/HeaderSecondary';
import IndexPage from 'flarum/forum/components/IndexPage';
import DiscussionPage from 'flarum/forum/components/DiscussionPage';
import LinkButton from 'flarum/common/components/LinkButton';
import Separator from 'flarum/common/components/Separator';
import RelatedDiscussions from './components/RelatedDiscussions';

function renderNeoTilerIcon() {
  return (
    <svg
      aria-hidden="true"
      className="icon Button-icon neo-tiler-svg"
      viewBox="0 0 16 16"
      width="15"
      height="15"
      fill="currentColor"
    >
      <rect x="1" y="1.5" width="6.5" height="13" rx="1.6" />
      <rect x="9" y="1.5" width="6" height="5.75" rx="1.6" />
      <rect x="9" y="8.75" width="6" height="5.75" rx="1.6" />
    </svg>
  );
}

app.initializers.add('neotiler/flarum-drawer-tags', () => {
  // 1. Mobile Drawer Tags
  extend(HeaderSecondary.prototype, 'items', function (items) {
    try {
      const tags = app.store.all('tags');

      if (!tags || tags.length === 0) return;

      const sortedTags = tags
        .filter((tag) => tag.position() !== null && !tag.isChild())
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

      // "NeoTiler for Mac" & "Blog" in mobile drawer right below All Discussions
      items.add(
        'drawerNeoTilerMac',
        <a
          href="https://getneotiler.com"
          className="Button Button--link hasIcon neo-ecosystem-link"
        >
          {renderNeoTilerIcon()}
          <span className="Button-label">NeoTiler for Mac</span>
        </a>,
        28.6
      );
      if (items.items && items.items.drawerNeoTilerMac) {
        items.items.drawerNeoTilerMac.itemClassName = 'drawer-only-li';
      }

      items.add(
        'drawerNeoTilerBlog',
        <a
          href="https://getneotiler.com/blog/"
          className="Button Button--link hasIcon neo-ecosystem-link"
        >
          <i aria-hidden="true" className="icon fas fa-newspaper fa-fw Button-icon" />
          <span className="Button-label">Blog</span>
        </a>,
        28.3
      );
      if (items.items && items.items.drawerNeoTilerBlog) {
        items.items.drawerNeoTilerBlog.itemClassName = 'drawer-only-li';
      }

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

  // 1b. Private Messages envelope button in secondary header (for fof/byobu)
  extend(HeaderSecondary.prototype, 'items', function (items) {
    try {
      if (!app.session || !app.session.user) return;
      if (!app.routes || !app.routes.byobuPrivate) return;

      items.add(
        'privateMessages',
        <LinkButton
          icon="fas fa-envelope"
          href={app.route('byobuPrivate')}
          className="Button Button--flat Header-messagesBtn"
          title="Messages"
          aria-label="Messages"
        >
          <span className="Header-messagesLabel">Messages</span>
        </LinkButton>,
        12
      );
    } catch (e) {
      console.warn('[drawer-tags] Could not render messages icon:', e);
    }
  });

  // 1c. Desktop & Tablet Left Sidebar: "NeoTiler for Mac" and "Blog" right under "Tags"
  extend(IndexPage.prototype, 'navItems', function (items) {
    try {
      if (!items || typeof items.add !== 'function') return;

      let basePriority = -10;
      if (items.items && items.items.tags && typeof items.items.tags.priority === 'number') {
        basePriority = items.items.tags.priority;
      }

      items.add(
        'neotilerMac',
        <a
          href="https://getneotiler.com"
          className="Button hasIcon neo-sidebar-link"
        >
          {renderNeoTilerIcon()}
          <span className="Button-label">NeoTiler for Mac</span>
        </a>,
        basePriority - 0.4
      );

      items.add(
        'neotilerBlog',
        <a
          href="https://getneotiler.com/blog/"
          className="Button hasIcon neo-sidebar-link"
        >
          <i aria-hidden="true" className="icon fas fa-newspaper Button-icon" />
          <span className="Button-label">Blog</span>
        </a>,
        basePriority - 0.8
      );
    } catch (e) {
      console.warn('[drawer-tags] Could not render sidebar ecosystem links:', e);
    }
  });

  // 2. Stack Overflow Style Sort Tabs (Replacing standard dropdown)
  extend(IndexPage.prototype, 'viewItems', function (items) {
    try {
      if (!items || typeof items.has !== 'function' || !items.has('sort')) return;

      const sortMap = app.discussions ? app.discussions.sortMap() : {};
      if (!sortMap || Object.keys(sortMap).length === 0) return;

      const currentSort =
        (app.search && app.search.params && app.search.params().sort) || Object.keys(sortMap)[0];

      const sortGroup = (
        <div className="so-sort-container">
          <div className="so-sort-group" role="group" aria-label="Sort discussions">
            {Object.keys(sortMap).map((key) => {
              const label = app.translator.trans(`core.forum.index_sort.${key}_button`);
              const isActive = currentSort === key;

              return (
                <button
                  type="button"
                  className={`so-sort-btn ${isActive ? 'is-active' : ''}`}
                  onclick={() => app.search.changeSort(key)}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      );

      items.setContent('sort', sortGroup);
    } catch (e) {
      console.warn('[drawer-tags] Could not render sort tabs:', e);
    }
  });

  // 3. Related Discussions section below the discussion main container
  // Mounted on DiscussionPage.pageContent (outside PostStream) so ReplyPlaceholder
  // scroll calculations and PostStreamScrubber positioning remain 100% untouched.
  extend(DiscussionPage.prototype, 'pageContent', function (items) {
    try {
      if (!this.discussion) return;

      const related = this.discussion.attribute('relatedDiscussions');
      if (!Array.isArray(related) || related.length === 0) return;

      items.add(
        'relatedDiscussions',
        <div className="container NeoRelatedDiscussions-container">
          <RelatedDiscussions discussion={this.discussion} />
        </div>,
        5
      );
    } catch (e) {
      console.warn('[drawer-tags] Could not render related discussions:', e);
    }
  });

  // Make the mobile logo clickable to return to home
  document.addEventListener('click', function (e) {
    if (window.innerWidth <= 768 && e.target.closest('.App-titleControl')) {
      e.preventDefault();
      m.route.set(app.route('index'));
    }
  });
});
