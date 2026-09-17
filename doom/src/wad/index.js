// Single import surface for the WAD subsystem (headless, no DOM).
export { CheckedReader, normName } from './checkedReader.js';
export { WadError, MapReport, WadReport } from './errors.js';
export { parseWadDirectory, lumpBytes, overlayLumps, HEADER_SIZE } from './wadDir.js';
export { discoverMaps, episodeClamp, isMapMarker, MAP_ORDER } from './mapDiscovery.js';
export {
  decodeVertexes, decodeThings, decodeLinedefs, decodeSidedefs, decodeSectors,
  decodeSegs, decodeSubsectors, decodeNodes, resolveRefs, checkReject, checkBlockmap,
} from './lumpDecoders.js';
export { detectNodeFormat, parseXnodCounts, inflateCapped, findGlBsp, INFLATE_CAP } from './extNodes.js';
export {
  decodePnames, decodeTextureLump, composeTexture, decodePicture, checkFlat,
  checkPlaypal, checkColormap, fallbackPalette, PLAYPAL_SIZE, COLORMAP_SIZE, FLAT_SIZE,
} from './textures.js';
export { detectHexen, isDehackedLump } from './hexenDetect.js';
