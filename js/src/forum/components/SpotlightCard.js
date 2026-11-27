import Component from 'flarum/common/Component';
import icon from 'flarum/common/helpers/icon';

// Cyber Monday 2026 end: Dec 1, 2026 23:59:59 PST (Dec 2, 2026 07:59:59 UTC)
const BF_END_UTC_MS = Date.UTC(2026, 11, 2, 7, 59, 59);

const VIDEO_BASE_URL = 'https://getneotiler.com/vid/';

// Visual Styles (V1 Cyan Terminal, V2 Neon Purple-Blue, V5 Cinema Edge-Bleed)
const STYLES = [
  {
    id: 'v1',
    mode: 'window',
    liveTag: 'LIVE',
    baseWeight: 32,
  },
  {
    id: 'v2',
    mode: 'window',
    liveTag: '60 FPS',
    baseWeight: 28,
  },
  {
    id: 'v5',
    mode: 'cinema',
    liveTag: 'NATIVE',
    baseWeight: 40,
  },
];

// Bound Copy + Video Hooks (each ties a specific headline/desc to its matching website video)
const HOOKS = [
  {
    id: 'dock',
    video: 'taskbar_preview.mp4',
    caption: 'Dock Preview',
    badgeEg: 'MACOS DOCK UPGRADE',
    headline: 'Windows-Style Live Dock Previews & Snap Zones for Mac.',
    desc: 'Hover any macOS Dock icon to preview live windows instantly, plus tile workspaces in pure Swift.',
    categories: ['mac', 'general', 'dev', 'hardware'],
  },
  {
    id: 'snap',
    video: 'snap_and_workspace.mp4',
    caption: 'NeoTiler.app',
    badgeEg: 'NATIVE SWIFT · MACOS',
    headline: 'Coding with AI Agents, IDE & Terminal on Mac?',
    desc: 'Tile Cursor, Antigravity, browser & terminal into custom snap zones in one keystroke. Zero bloat.',
    categories: ['dev', 'mac'],
  },
  {
    id: 'zones',
    video: 'custom_snap_area.mp4',
    caption: 'Custom Zones',
    badgeEg: 'MACOS WORKSPACES',
    headline: 'Gaming, Streaming or Multitasking on Mac?',
    desc: 'Snap Remote Play, Discord, guides & browser windows into instant custom multi-column layouts.',
    categories: ['games', 'hardware', 'general'],
  },
  {
    id: 'sync',
    video: 'cursor_sync_and_custom_snap_zones.mp4',
    caption: 'Multi-Display',
    badgeEg: 'MULTI-DISPLAY PRO',
    headline: 'The Missing Window Manager & Multi-Display Sync for Mac.',
    desc: 'Custom snap zones, multi-monitor cursor sync & live Dock previews built in native Swift.',
    categories: ['hardware', 'mac', 'dev'],
  },
  {
    id: 'shake',
    video: 'shake_to_minimize.mp4',
    caption: 'Shake to Focus',
    badgeEg: 'INSTANT FOCUS · MAC',
    headline: 'Shake One Mac Window to Instantly Minimize Everything Else.',
    desc: 'Zero desktop clutter in 0.2 seconds — plus custom snap zones & live Dock previews in native Swift.',
    categories: ['general', 'mac', 'games'],
  },
  {
    id: 'switcher',
    video: 'advance_app_swicher.mp4',
    caption: 'App Switcher',
    badgeEg: 'APPLE SILICON READY',
    headline: 'Instant Window Switcher, Snap Zones & Live Dock for macOS.',
    desc: 'Switch, tile & preview every open Mac window at 120Hz without draining Apple Silicon battery.',
    categories: ['dev', 'hardware', 'mac'],
  },
];

const DEV_SLUGS = new Set([
  'ai-focus',
  'local-llm-self-hosting',
  'dev-talk',
  'web-backend',
  'devops-cloud',
]);

const GAME_SLUGS = new Set(['games']);

const HARDWARE_SLUGS = new Set(['hardware', 'macos-swift-dev', 'showcase']);

// Per-discussion deterministic session cache so Mithril redraws never flicker
// and multiple slots inside the same discussion never repeat a style or video
const DISCUSSION_CREATIVE_CACHE = new Map();

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

function resolveCategoryBucket(discussion) {
  try {
    const tags = discussion && typeof discussion.tags === 'function' ? discussion.tags() : [];
    if (Array.isArray(tags) && tags.length > 0) {
      const slugs = tags
        .map((t) => (t && typeof t.slug === 'function' ? t.slug() : ''))
        .filter(Boolean);

      if (slugs.some((s) => GAME_SLUGS.has(s))) return 'games';
      if (slugs.some((s) => DEV_SLUGS.has(s))) return 'dev';
      if (slugs.some((s) => HARDWARE_SLUGS.has(s))) return 'hardware';
    }
  } catch (e) {
    // Fallback safely
  }
  return 'general';
}

function pickWeighted(items, getWeight) {
  let total = 0;
  const weights = items.map((item) => {
    const w = Math.max(1, Number(getWeight(item)) || 1);
    total += w;
    return w;
  });

  let roll = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return items[i];
  }
  return items[items.length - 1];
}

function getCreativeForSlot(discussion, postNumber) {
  const discId = (discussion && typeof discussion.id === 'function' && discussion.id()) || 'default';
  let discRecord = DISCUSSION_CREATIVE_CACHE.get(discId);

  if (!discRecord) {
    discRecord = {
      slots: new Map(),
      usedStyles: new Set(),
      usedHooks: new Set(),
    };
    DISCUSSION_CREATIVE_CACHE.set(discId, discRecord);
  }

  if (discRecord.slots.has(postNumber)) {
    return discRecord.slots.get(postNumber);
  }

  const bucket = resolveCategoryBucket(discussion);

  // Filter out styles already used in this discussion (reset if all 3 used)
  let availableStyles = STYLES.filter((s) => !discRecord.usedStyles.has(s.id));
  if (availableStyles.length === 0) availableStyles = STYLES.slice();

  const chosenStyle = pickWeighted(availableStyles, (s) => {
    if (bucket === 'games' && s.id === 'v2') return 55;
    if (bucket === 'dev' && (s.id === 'v1' || s.id === 'v5')) return 45;
    return s.baseWeight;
  });

  // Filter out video hooks already used in this discussion
  let availableHooks = HOOKS.filter((h) => !discRecord.usedHooks.has(h.id));
  if (availableHooks.length === 0) availableHooks = HOOKS.slice();

  const chosenHook = pickWeighted(availableHooks, (h) => {
    let weight = 10;
    if (h.categories.includes(bucket)) weight += 28;
    // Slight affinity pairing so V2 Neon favors zones/shake/dock and V5 Cinema favors dock/sync/snap
    if (chosenStyle.id === 'v2' && (h.id === 'zones' || h.id === 'shake')) weight += 14;
    if (chosenStyle.id === 'v5' && (h.id === 'dock' || h.id === 'sync')) weight += 14;
    if (chosenStyle.id === 'v1' && (h.id === 'snap' || h.id === 'dock')) weight += 14;
    return weight;
  });

  discRecord.usedStyles.add(chosenStyle.id);
  discRecord.usedHooks.add(chosenHook.id);

  const assignment = { style: chosenStyle, hook: chosenHook };
  discRecord.slots.set(postNumber, assignment);
  return assignment;
}

// Shared IntersectionObserver so videos only load & play when near viewport
let sharedVideoObserver = null;

function getVideoObserver() {
  if (sharedVideoObserver || typeof window === 'undefined' || !('IntersectionObserver' in window)) {
    return sharedVideoObserver;
  }

  sharedVideoObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const video = entry.target;
        if (!video) return;

        if (entry.isIntersecting) {
          const dataSrc = video.getAttribute('data-src');
          if (dataSrc && !video.getAttribute('src')) {
            video.setAttribute('src', dataSrc);
            video.load();
          }
          const playPromise = video.play();
          if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(() => {});
          }
        } else if (!video.paused) {
          video.pause();
        }
      });
    },
    { rootMargin: '240px 0px' }
  );

  return sharedVideoObserver;
}

export default class SpotlightCard extends Component {
  oncreate(vnode) {
    super.oncreate(vnode);
    this.bindVideo(vnode.dom);
  }

  onupdate(vnode) {
    super.onupdate(vnode);
    this.bindVideo(vnode.dom);
  }

  onremove(vnode) {
    const video = vnode.dom && vnode.dom.querySelector('video.NeoSpotlight-video');
    const observer = getVideoObserver();
    if (video && observer) {
      observer.unobserve(video);
    }
    super.onremove(vnode);
  }

  bindVideo(rootEl) {
    if (!rootEl) return;
    const video = rootEl.querySelector('video.NeoSpotlight-video');
    if (!video || video.dataset.bound === '1') return;

    video.dataset.bound = '1';
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;

    const observer = getVideoObserver();
    if (observer) {
      observer.observe(video);
    } else {
      const dataSrc = video.getAttribute('data-src');
      if (dataSrc && !video.getAttribute('src')) {
        video.setAttribute('src', dataSrc);
      }
      const playPromise = video.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {});
      }
    }
  }

  view() {
    const discussion = this.attrs.discussion;
    const postNumber = Number(this.attrs.postNumber) || 1;
    const isBlackFriday = Date.now() <= BF_END_UTC_MS;
    const os = detectDeviceOs();
    const campaign = isBlackFriday ? 'bf2026' : 'evergreen';

    const { style, hook } = getCreativeForSlot(discussion, postNumber);
    const utmContent = `${os}_${style.id}_${hook.id}_p${postNumber}`;
    const href = `https://getneotiler.com/?utm_source=social&utm_medium=spotlight&utm_campaign=${campaign}&utm_content=${utmContent}`;
    const videoUrl = `${VIDEO_BASE_URL}${hook.video}`;

    const isCinema = style.mode === 'cinema';

    return (
      <aside className={`NeoSpotlight is-post-${postNumber}`} aria-label="NeoTiler for macOS">
        <a
          className={`NeoSpotlight-card is-style-${style.id} ${isCinema ? 'is-cinema' : 'is-window'}`}
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
                  width="22"
                  height="22"
                  loading="lazy"
                />
              </span>
              <span className="NeoSpotlight-brandName">NeoTiler</span>
              <span className={`NeoSpotlight-badge ${isBlackFriday ? 'is-deal' : ''}`}>
                {isBlackFriday ? 'BLACK FRIDAY · 30% OFF' : hook.badgeEg}
              </span>
            </div>

            <div className="NeoSpotlight-title">{hook.headline}</div>
            <div className="NeoSpotlight-desc">{hook.desc}</div>

            <div className="NeoSpotlight-footerRow">
              <span className="NeoSpotlight-cta">
                <span>{isBlackFriday ? 'Claim $6.99 Lifetime' : 'Try Free on Mac'}</span>
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
                    <strong>$9.99 lifetime</strong>
                  )}
                  <span className="NeoSpotlight-dotSep"> · </span>
                  <span className="NeoSpotlight-trustInline">14-day free trial</span>
                </div>
              </div>
            </div>
          </div>

          {isCinema ? (
            <div className="NeoSpotlight-bleedWrap" aria-hidden="true">
              <video
                className="NeoSpotlight-video"
                data-src={videoUrl}
                muted
                loop
                playsinline
                preload="none"
              />
            </div>
          ) : (
            <div className="NeoSpotlight-macFrame" aria-hidden="true">
              <div className="NeoSpotlight-macTitlebar">
                <span className="NeoSpotlight-dots">
                  <i className="is-r" />
                  <i className="is-y" />
                  <i className="is-g" />
                </span>
                <span className="NeoSpotlight-macCaption">{hook.caption}</span>
                <span className="NeoSpotlight-macLive">{style.liveTag}</span>
              </div>
              <div className="NeoSpotlight-videoStage">
                <video
                  className="NeoSpotlight-video"
                  data-src={videoUrl}
                  muted
                  loop
                  playsinline
                  preload="none"
                />
              </div>
            </div>
          )}
        </a>
      </aside>
    );
  }
}
