export default `
v-scroll {
  display: block;
  position: relative;
  overflow: hidden;
  height: 100%;
  width: 100%;
}
v-scroll::part(viewport) {
  display: block;
  width: 100%;
  height: 100%;
  overflow: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
v-scroll::part(viewport)::-webkit-scrollbar {
  display: none !important;
  width: 0 !important;
  height: 0 !important;
  background: transparent;
}
v-scroll::part(track) {
  position: absolute;
  top: 0;
  right: 0px;
  width: 20px;
  height: 100%;
  pointer-events: auto;
  z-index: 10;
  background-color: transparent;
  transition: background-color 0.3s;
}
v-scroll[data-track-hover]::part(track),
v-scroll[data-dragging]::part(track) {
  background-color: rgba(255, 105, 180, 0.1); /* 浅粉色轨道 */
}
v-scroll[data-track-hover]::part(bar),
v-scroll[data-dragging]::part(bar) {
  opacity: 1;
}
v-scroll[data-scrolling]::part(bar) {
  opacity: 1;
}
v-scroll::part(bar) {
  position: absolute;
  top: 0;
  right: 4px;
  width: 12px; /* 更粗的滚动条 */
  border-radius: 6px;
  background-color: #ff69b4; /* 默认热粉色 */
  cursor: pointer;
  pointer-events: auto;
  transition: background-color 0.3s, width 0.3s, right 0s, opacity 0.5s;
  opacity: 0;
}
v-scroll::part(bar):hover {
  background-color: #ff1493; /* hover 时深粉色 */
  width: 16px;
  right: 2px;
  border-radius: 8px;
}
v-scroll[data-dragging]::part(bar) {
  background-color: #c71585; /* 拖拽时更深的紫粉色 */
  width: 16px;
  right: 2px;
  border-radius: 8px;
}
`;