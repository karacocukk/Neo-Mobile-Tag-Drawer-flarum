import Component from 'flarum/common/Component';
import icon from 'flarum/common/helpers/icon';

// Cyber Monday 2026 end: Dec 1, 2026 23:59:59 PST (Dec 2, 2026 07:59:59 UTC)
const BF_END_UTC_MS = Date.UTC(2026, 11, 2, 7, 59, 59);

const DEV_TAG_SLUGS = new Set([
  'ai-focus',
  'local-llm-self-hosting',
  'dev-talk',
  'web-backend',
  'devops-cloud',
]);

const MAC_PRIORITY_SLUGS = new Set([
  'macos-swift-dev',
  'hardware',
  'support-feedback',
  'showcase',
]);

function detectDeviceOs() {
  try {
    const ua = navigator.userAgent || '';
    const platform =
      (navigator.userAgentData && navigator.userAgentData.platform) ||
      navigator.platform ||
      '';
    const combined = `${platform} ${ua}`;

    // iPadOS desktop-class UA reports Macintosh with touch points
    if (/iPhone|iPad|iPod/i.test(combined) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) {
      return 'ios';
    }
    if (/Mac|Macintosh/i.test(combined)) {
      return 'mac';
    }
    if (/Android/i.test(combined)) {
      return 'android';
    }
    if (/Win/i.test(combined)) {
      return 'win';
    }
    if (/Linux|X11/i.test(combined)) {
      return 'linux';
    }
  } catch (e) {
    // Fallback safely
  }
  return 'other';
}

function resolveCopyVariant(discussion) {
  try {
    const tags = discussion && typeof discussion.tags === 'function' ? discussion.tags() : [];
    if (Array.isArray(tags) && tags.length > 0) {
      const slugs = tags
        .map((t) => (t && typeof t.slug === 'function' ? t.slug() : ''))
        .filter(Boolean);

      if (slugs.some((s) => MAC_PRIORITY_SLUGS.has(s))) {
        return 'mac';
      }
      if (slugs.some((s) => DEV_TAG_SLUGS.has(s))) {
        return 'dev';
      }
    }
  } catch (e) {
    // Fallback to mac copy
  }
  return 'mac';
}

export default class SpotlightCard extends Component {
  view() {
    const discussion = this.attrs.discussion;
    const isBlackFriday = Date.now() <= BF_END_UTC_MS;
    const os = detectDeviceOs();
    const variant = resolveCopyVariant(discussion);
    const campaign = isBlackFriday ? 'bf2026' : 'evergreen';

    const href = `https://getneotiler.com/?utm_source=social&utm_medium=spotlight&utm_campaign=${campaign}&utm_content=${os}_${variant}`;

    const isDevCopy = variant === 'dev';
    const headline = isDevCopy
      ? 'Coding with AI, IDE & Terminal on Mac?'
      : 'The missing native window manager for macOS.';
    const description = isDevCopy
      ? 'Snap your editor, browser & terminal into custom zones in 1 shortcut. Built in native Swift.'
      : 'Custom snap zones, instant shortcuts & live Dock previews in native Swift. Zero bloat.';

    return (
      <aside className="NeoSpotlight" aria-label="NeoTiler for macOS">
        <a
          className="NeoSpotlight-card"
          href={href}
          target="_blank"
          rel="noopener"
          onclick={(e) => e.currentTarget.blur()}
        >
          <div className="NeoSpotlight-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
              <rect x="2.5" y="2.5" width="8.5" height="8.5" rx="2.2" />
              <rect x="13" y="2.5" width="8.5" height="8.5" rx="2.2" />
              <rect x="2.5" y="13" width="8.5" height="8.5" rx="2.2" />
              <rect x="13" y="13" width="8.5" height="8.5" rx="2.2" />
            </svg>
          </div>

          <div className="NeoSpotlight-body">
            <div className="NeoSpotlight-topRow">
              <span className={`NeoSpotlight-badge ${isBlackFriday ? 'is-deal' : ''}`}>
                {isBlackFriday ? 'BLACK FRIDAY · 30% OFF' : 'NEOTILER FOR MAC'}
              </span>
              <span className="NeoSpotlight-price">
                {isBlackFriday ? (
                  <span>
                    <del className="NeoSpotlight-oldPrice">$9.99</del>{' '}
                    <strong>$6.99 Lifetime</strong>
                  </span>
                ) : (
                  <strong>$9.99 Lifetime</strong>
                )}
              </span>
            </div>

            <div className="NeoSpotlight-title">{headline}</div>
            <div className="NeoSpotlight-desc">{description}</div>
            <div className="NeoSpotlight-trust">
              14-day free trial · No credit card · Pay once, own forever
            </div>
          </div>

          <div className="NeoSpotlight-ctaWrap">
            <span className="NeoSpotlight-cta">
              <span>{isBlackFriday ? 'Claim $6.99' : 'Try Free'}</span>
              {icon('fas fa-arrow-right')}
            </span>
          </div>
        </a>
      </aside>
    );
  }
}
