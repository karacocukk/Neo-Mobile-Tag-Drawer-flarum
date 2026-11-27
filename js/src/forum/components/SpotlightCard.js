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
    // Fallback safely
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
      ? 'Snap your AI IDE, Browser & Terminal on Mac.'
      : 'The Missing Native Window Manager for macOS.';
    const description = isDevCopy
      ? 'Custom snap zones, instant shortcuts & live Dock previews in native Swift. Zero bloat.'
      : 'Custom snap zones, keyboard shortcuts & live Dock previews built in native Swift.';

    return (
      <aside className="NeoSpotlight" aria-label="NeoTiler for macOS">
        <a
          className="NeoSpotlight-card"
          href={href}
          target="_blank"
          rel="noopener"
          onclick={(e) => e.currentTarget.blur()}
        >
          <span className="NeoSpotlight-disclosure" title="Sponsored by NeoTiler">
            Ad
          </span>

          <div className="NeoSpotlight-content">
            <div className="NeoSpotlight-brandRow">
              <span className="NeoSpotlight-logoFrame">
                <img
                  src="https://getneotiler.com/neotiler-logo.png"
                  alt="NeoTiler"
                  width="24"
                  height="24"
                  loading="eager"
                />
              </span>
              <span className="NeoSpotlight-brandName">NeoTiler</span>
              <span className={`NeoSpotlight-badge ${isBlackFriday ? 'is-deal' : ''}`}>
                {isBlackFriday ? 'BLACK FRIDAY · 30% OFF' : 'FOR MACOS'}
              </span>
            </div>

            <div className="NeoSpotlight-title">{headline}</div>
            <div className="NeoSpotlight-desc">{description}</div>

            <div className="NeoSpotlight-footerRow">
              <span className="NeoSpotlight-cta">
                <span>{isBlackFriday ? 'Claim $6.99 Lifetime' : 'Download Free Trial'}</span>
                {icon('fas fa-arrow-right')}
              </span>

              <div className="NeoSpotlight-pricingMeta">
                <div className="NeoSpotlight-priceLine">
                  {isBlackFriday ? (
                    <span>
                      <del className="NeoSpotlight-oldPrice">$9.99</del>{' '}
                      <strong>$6.99 one-time</strong>
                    </span>
                  ) : (
                    <strong>$9.99 one-time</strong>
                  )}
                </div>
                <div className="NeoSpotlight-trustLine">
                  14-day free trial · No subscription
                </div>
              </div>
            </div>
          </div>

          <div className="NeoSpotlight-visual" aria-hidden="true">
            <div className="NeoSpotlight-screen">
              <div className="NeoSpotlight-menubar">
                <span className="NeoSpotlight-dots">
                  <i className="is-r" />
                  <i className="is-y" />
                  <i className="is-g" />
                </span>
                <span className="NeoSpotlight-menuTitle">NeoTiler</span>
              </div>
              <div className="NeoSpotlight-grid">
                <div className="NeoSpotlight-pane is-primary">
                  <span className="NeoSpotlight-bar is-lg" />
                  <span className="NeoSpotlight-bar is-md" />
                  <span className="NeoSpotlight-bar is-sm" />
                </div>
                <div className="NeoSpotlight-rightCol">
                  <div className="NeoSpotlight-pane is-accent">
                    <span className="NeoSpotlight-snapTag">⌘⌥→</span>
                  </div>
                  <div className="NeoSpotlight-pane is-secondary">
                    <span className="NeoSpotlight-bar is-md" />
                    <span className="NeoSpotlight-bar is-sm" />
                  </div>
                </div>
              </div>
              <div className="NeoSpotlight-dock">
                <i />
                <i className="is-active" />
                <i />
                <i />
              </div>
            </div>
          </div>
        </a>
      </aside>
    );
  }
}
