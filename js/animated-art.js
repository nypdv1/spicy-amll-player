/**
 * Spicy AMLL Player WEB — Animated Artwork
 * Fetches animated (video) album art from Apple Music via iTunes search + Dodson proxy.
 * Based on the animated-art-test implementation.
 */
import { robustFetch } from './network-utils.js';

async function searchiTunes(query) {
  try {
    const encoded = encodeURIComponent(query);
    // Use Spicy AMLL Server as a proxy for iTunes search to avoid CORS issues on Netlify
    const res = await fetch(`https://api.spicyamll.online/search?term=${encoded}&types=albums&limit=5`);
    if (!res.ok) return null;

    const data = await res.json();
    const albums = data.results?.albums?.data;
    if (!albums || albums.length === 0) return null;

    // Return the album ID instead of catalog URL
    return albums[0].id || null;
  } catch (err) {
    console.warn('[AnimatedArt] iTunes search failed:', err);
    return null;
  }
}

/**
 * Try to fetch animated cover art for a song.
 * Searches with artist + album, falling back to artist + title if album search fails.
 * @param {string} artist - Artist name
 * @param {string} album - Album name
 * @param {string} [title] - Song title (used as fallback search)
 * @returns {Promise<string|null>} Video URL for animated artwork, or null
 */
export async function getAnimatedArtwork(artist, album, title) {
  if (!artist) return null;

  // Strategy 1: Search with "artist album"
  if (album) {
    console.log(`[AnimatedArt] Searching: "${artist} ${album}"`);
    const albumId = await searchiTunes(`${artist} ${album}`);
    if (albumId) {
      console.log(`[AnimatedArt] Found Album ID via album search: ${albumId}`);
      return `https://api.spicyamll.online/animatedart?album=${albumId}&quality=high`;
    }
  }

  // Strategy 2: Fallback to "artist title" if album search failed or no album
  if (title && title !== album) {
    console.log(`[AnimatedArt] Album search failed, trying: "${artist} ${title}"`);
    const albumId = await searchiTunes(`${artist} ${title}`);
    if (albumId) {
      console.log(`[AnimatedArt] Found Album ID via title search: ${albumId}`);
      return `https://api.spicyamll.online/animatedart?album=${albumId}&quality=high`;
    }
  }

  // Strategy 3: Try just artist name as last resort
  console.log(`[AnimatedArt] Trying artist-only search: "${artist}"`);
  const albumId = await searchiTunes(artist);
  if (albumId) {
    console.log(`[AnimatedArt] Found Album ID via artist-only: ${albumId}`);
    return `https://api.spicyamll.online/animatedart?album=${albumId}&quality=high`;
  }

  console.log('[AnimatedArt] No animated artwork found after all strategies');
  return null;
}

/**
 * Apply animated artwork to the album art container.
 * @param {HTMLElement} mediaBoxEl - The .MediaImageContainer element
 * @param {string} videoUrl - The animated artwork video URL
 */
export function applyAnimatedArt(mediaBoxEl, videoUrl) {
  if (!mediaBoxEl || !videoUrl) return;

  // Remove any existing video
  const existingVideo = mediaBoxEl.querySelector('.animated-art-video');
  if (existingVideo) existingVideo.remove();

  const video = document.createElement('video');
  video.crossOrigin = 'anonymous';
  video.classList.add('animated-art-video');
  video.src = videoUrl;
  video.autoplay = true;
  video.loop = true;
  video.muted = true;
  video.playsInline = true;
  video.setAttribute('playsinline', '');
  video.setAttribute('disablepictureinpicture', '');

  // Hide the static background image when video loads
  video.addEventListener('loadeddata', () => {
    mediaBoxEl.style.backgroundImage = 'none';
    video.classList.add('loaded');
  });

  video.addEventListener('error', () => {
    console.warn('[AnimatedArt] Video failed to load');
    video.remove();
  });

  mediaBoxEl.appendChild(video);
}
