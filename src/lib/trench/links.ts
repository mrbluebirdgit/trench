export function gmgnUrl(mint: string) {
  return `https://gmgn.ai/sol/token/${mint}`;
}
export function pumpUrl(mint: string) {
  return `https://pump.fun/coin/${mint}`;
}
export function dexUrl(mint: string) {
  return `https://dexscreener.com/solana/${mint}`;
}
export function jupUrl(mint: string) {
  return `https://jup.ag/swap/SOL-${mint}`;
}
export function birdeyeUrl(mint: string) {
  return `https://birdeye.so/token/${mint}?chain=solana`;
}
export function photonUrl(mint: string) {
  return `https://photon-sol.tinyastro.io/en/lp/${mint}`;
}
export function axiomUrl(mint: string) {
  return `https://axiom.trade/t/${mint}`;
}
export function solscanUrl(mint: string) {
  return `https://solscan.io/token/${mint}`;
}
export function xSearchUrl(q: string) {
  return `https://x.com/search?q=${encodeURIComponent(q)}&f=live`;
}
