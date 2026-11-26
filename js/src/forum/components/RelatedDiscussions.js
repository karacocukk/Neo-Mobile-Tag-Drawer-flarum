import app from 'flarum/forum/app';
import Component from 'flarum/common/Component';
import Link from 'flarum/common/components/Link';
import icon from 'flarum/common/helpers/icon';

function getContrastTextColor(hex) {
  if (!hex || typeof hex !== 'string') return '#ffffff';
  const clean = hex.replace('#', '').trim();
  const full = clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean;
  if (full.length !== 6) return '#ffffff';
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return '#ffffff';
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 165 ? '#111827' : '#ffffff';
}

export default class RelatedDiscussions extends Component {
  view() {
    const discussion = this.attrs.discussion;
    if (!discussion) return null;

    const related = discussion.attribute('relatedDiscussions');
    if (!Array.isArray(related) || related.length === 0) return null;

    // Pick the most specific tag of the current discussion for the "Browse more" link
    let browseTag = null;
    try {
      const currentTags = typeof discussion.tags === 'function' ? discussion.tags() : [];
      if (Array.isArray(currentTags) && currentTags.length > 0) {
        const child = currentTags.find((t) => t && typeof t.isChild === 'function' && t.isChild());
        const topicalPrimary = currentTags.find((t) => {
          const s = t && typeof t.slug === 'function' ? t.slug() : '';
          return s && s !== 'announcements' && s !== 'general';
        });
        browseTag = child || topicalPrimary || currentTags[0];
      }
    } catch (e) {
      browseTag = null;
    }

    return (
      <section className="NeoRelatedDiscussions" aria-label="Related Discussions">
        <div className="NeoRelatedDiscussions-header">
          <h2 className="NeoRelatedDiscussions-heading">
            {icon('fas fa-layer-group', { className: 'NeoRelatedDiscussions-headingIcon' })}
            <span>Related Discussions</span>
          </h2>
          {browseTag && (
            <Link
              className="NeoRelatedDiscussions-moreLink"
              href={app.route('tag', { tags: browseTag.slug() })}
            >
              <span>More in {browseTag.name()}</span>
              {icon('fas fa-arrow-right')}
            </Link>
          )}
        </div>

        <ul className="NeoRelatedDiscussions-list">
          {related.map((item) => {
            const href = app.route('discussion', { id: item.slug });
            const replies = Math.max(0, (item.commentCount || 1) - 1);
            const relTime = item.lastPostedAt && typeof dayjs === 'function'
              ? dayjs(item.lastPostedAt).fromNow()
              : '';
            const tags = Array.isArray(item.tags) ? item.tags : [];

            return (
              <li className="NeoRelatedDiscussions-item" key={item.id}>
                <Link className="NeoRelatedDiscussions-link" href={href}>
                  <div className="NeoRelatedDiscussions-main">
                    <div className="NeoRelatedDiscussions-title">{item.title}</div>
                    <div className="NeoRelatedDiscussions-meta">
                      {tags.length > 0 && (
                        <span className="NeoRelatedDiscussions-tags">
                          {tags.map((tag) => {
                            const hasColor = Boolean(tag.color);
                            const tagStyle = hasColor
                              ? {
                                  backgroundColor: tag.color,
                                  color: getContrastTextColor(tag.color),
                                }
                              : {};
                            return (
                              <span
                                className={`NeoRelatedDiscussions-tag ${hasColor ? 'is-colored' : ''}`}
                                key={tag.slug}
                                style={tagStyle}
                              >
                                {tag.icon ? icon(tag.icon, { className: 'NeoRelatedDiscussions-tagIcon' }) : null}
                                <span>{tag.name}</span>
                              </span>
                            );
                          })}
                        </span>
                      )}
                      {relTime && <span className="NeoRelatedDiscussions-time">{relTime}</span>}
                    </div>
                  </div>
                  <div className="NeoRelatedDiscussions-stats" title={`${replies} replies`}>
                    {icon('far fa-comment')}
                    <span>{replies}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    );
  }
}
