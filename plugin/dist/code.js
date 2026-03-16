"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __async = (__this, __arguments, generator) => {
    return new Promise((resolve, reject) => {
      var fulfilled = (value) => {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      };
      var rejected = (value) => {
        try {
          step(generator.throw(value));
        } catch (e) {
          reject(e);
        }
      };
      var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
      step((generator = generator.apply(__this, __arguments)).next());
    });
  };

  // src/utils/metadata.ts
  function saveSliceData(frameId, data) {
    const frame = figma.getNodeById(frameId);
    if (!frame) throw new Error(`Frame ${frameId} not found`);
    frame.setPluginData("klaviyo_slices", JSON.stringify(data));
  }
  function loadSliceData(frameId) {
    const frame = figma.getNodeById(frameId);
    if (!frame) return null;
    const data = frame.getPluginData("klaviyo_slices");
    return data ? JSON.parse(data) : null;
  }
  var init_metadata = __esm({
    "src/utils/metadata.ts"() {
      "use strict";
    }
  });

  // src/utils/export.ts
  function uint8ArrayToBase64(bytes) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let result = "";
    let i = 0;
    while (i < bytes.length) {
      const a = bytes[i++];
      const b = i < bytes.length ? bytes[i++] : 0;
      const c = i < bytes.length ? bytes[i++] : 0;
      result += chars[a >> 2];
      result += chars[(a & 3) << 4 | b >> 4];
      result += i - 2 < bytes.length ? chars[(b & 15) << 2 | c >> 6] : "=";
      result += i - 1 < bytes.length ? chars[c & 63] : "=";
    }
    return result;
  }
  var init_export = __esm({
    "src/utils/export.ts"() {
      "use strict";
    }
  });

  // src/utils/figma-api.ts
  function getSelectedEmailFrames() {
    return figma.currentPage.selection.filter((node) => node.type === "FRAME").map((node) => node).filter((frame) => frame.width >= 500 && frame.width <= 700);
  }
  function getAllEmailFrames() {
    return figma.currentPage.children.filter((node) => node.type === "FRAME").map((node) => node).filter((frame) => frame.width >= 500 && frame.width <= 700);
  }
  var init_figma_api = __esm({
    "src/utils/figma-api.ts"() {
      "use strict";
    }
  });

  // src/code.ts
  var require_code = __commonJS({
    "src/code.ts"(exports) {
      init_metadata();
      init_export();
      init_figma_api();
      figma.showUI(__html__, { width: 400, height: 600, title: "Figma \u2192 Klaviyo" });
      var initialSelected = getSelectedEmailFrames();
      if (initialSelected.length > 0) {
        const data = initialSelected.map((frame) => ({
          id: frame.id,
          name: frame.name,
          width: frame.width,
          height: frame.height,
          existingSliceData: loadSliceData(frame.id)
        }));
        figma.ui.postMessage({ type: "FRAMES_SELECTED", data });
      } else {
        notifyAllPageFrames();
      }
      figma.on("currentpagechange", () => {
        notifyAllPageFrames();
      });
      figma.on("selectionchange", () => {
        const selected = getSelectedEmailFrames();
        if (selected.length > 0) {
          const data = selected.map((frame) => ({
            id: frame.id,
            name: frame.name,
            width: frame.width,
            height: frame.height,
            existingSliceData: loadSliceData(frame.id)
          }));
          figma.ui.postMessage({ type: "FRAMES_SELECTED", data });
        } else {
          notifyAllPageFrames();
        }
      });
      figma.ui.onmessage = (msg) => __async(null, null, function* () {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        try {
          switch (msg.type) {
            case "GET_ALL_FRAMES": {
              notifyAllPageFrames();
              break;
            }
            case "GET_SELECTED_FRAME": {
              notifyAllPageFrames();
              break;
            }
            case "EXPORT_FRAME": {
              const frameNode = figma.getNodeById(msg.frameId);
              if (!frameNode) throw new Error(`Frame ${msg.frameId} not found`);
              const bytes = yield frameNode.exportAsync({
                format: "PNG",
                constraint: { type: "SCALE", value: 2 }
              });
              figma.ui.postMessage({ type: "FRAME_EXPORTED", data: uint8ArrayToBase64(bytes) });
              break;
            }
            case "GET_FRAME_LAYOUT": {
              const layoutFrame = figma.getNodeById(msg.frameId);
              if (!layoutFrame) throw new Error(`Frame ${msg.frameId} not found`);
              const frameAbsY = (_b = (_a = layoutFrame.absoluteBoundingBox) == null ? void 0 : _a.y) != null ? _b : 0;
              const bands = computeSliceBands(layoutFrame, frameAbsY, layoutFrame.height);
              figma.ui.postMessage({ type: "FRAME_LAYOUT", bands, frameHeight: layoutFrame.height });
              break;
            }
            case "GET_FIGMA_SLICES": {
              const frameNode = figma.getNodeById(msg.frameId);
              if (!frameNode) throw new Error(`Frame ${msg.frameId} not found`);
              const frameAbsY = (_d = (_c = frameNode.absoluteBoundingBox) == null ? void 0 : _c.y) != null ? _d : 0;
              const sliceNodes = frameNode.children.filter((n) => n.type === "SLICE" && n.visible);
              if (sliceNodes.length === 0) {
                figma.ui.postMessage({ type: "FIGMA_SLICES_LOADED", slices: [] });
                break;
              }
              const figmaSlices = [];
              for (let i = 0; i < sliceNodes.length; i++) {
                const node = sliceNodes[i];
                const bbox = node.absoluteBoundingBox;
                if (!bbox) continue;
                const y_start = Math.max(0, Math.round(bbox.y - frameAbsY));
                const y_end = Math.min(frameNode.height, Math.round(bbox.y - frameAbsY + bbox.height));
                if (y_end <= y_start) continue;
                const bytes = yield node.exportAsync({ format: "PNG", constraint: { type: "SCALE", value: 2 } });
                figmaSlices.push({ name: node.name || `slice_${i + 1}`, y_start, y_end, imageBase64: uint8ArrayToBase64(bytes) });
              }
              figmaSlices.sort((a, b) => a.y_start - b.y_start);
              figma.ui.postMessage({ type: "FIGMA_SLICES_LOADED", slices: figmaSlices });
              break;
            }
            case "CREATE_SLICE_NODES": {
              const frameNode = figma.getNodeById(msg.frameId);
              if (!frameNode) throw new Error(`Frame ${msg.frameId} not found`);
              const existing = frameNode.children.filter((n) => n.type === "SLICE");
              for (const node of existing) node.remove();
              for (const slice of msg.slices) {
                const sliceNode = figma.createSlice();
                frameNode.appendChild(sliceNode);
                sliceNode.x = 0;
                sliceNode.y = slice.y_start;
                sliceNode.resize(frameNode.width, slice.y_end - slice.y_start);
                sliceNode.name = slice.name;
              }
              const createdNodes = frameNode.children.filter((n) => n.type === "SLICE");
              const absY = (_f = (_e = frameNode.absoluteBoundingBox) == null ? void 0 : _e.y) != null ? _f : 0;
              const exportedSlices = [];
              for (const node of createdNodes) {
                const bytes = yield node.exportAsync({ format: "PNG", constraint: { type: "SCALE", value: 2 } });
                const bbox = node.absoluteBoundingBox;
                if (!bbox) continue;
                const y_start = Math.max(0, Math.round(bbox.y - absY));
                const y_end = Math.min(frameNode.height, Math.round(bbox.y - absY + bbox.height));
                exportedSlices.push({ name: node.name, y_start, y_end, imageBase64: uint8ArrayToBase64(bytes) });
              }
              figma.ui.postMessage({ type: "SLICE_NODES_CREATED", slices: exportedSlices });
              break;
            }
            case "SAVE_SLICE_DATA": {
              saveSliceData(msg.frameId, msg.data);
              figma.ui.postMessage({ type: "SLICE_DATA_SAVED" });
              break;
            }
            case "LOAD_SLICE_DATA": {
              const data = loadSliceData(msg.frameId);
              figma.ui.postMessage({ type: "SLICE_DATA_LOADED", data });
              break;
            }
            case "RESIZE_PLUGIN": {
              figma.ui.resize(msg.width, msg.height);
              break;
            }
            case "GET_USER_INFO": {
              figma.ui.postMessage({
                type: "USER_INFO",
                name: (_h = (_g = figma.currentUser) == null ? void 0 : _g.name) != null ? _h : "Unknown"
              });
              break;
            }
            case "SAVE_KLAVIYO_KEY": {
              yield figma.clientStorage.setAsync("klaviyo_api_key", msg.key);
              figma.ui.postMessage({ type: "KLAVIYO_KEY_SAVED" });
              break;
            }
            case "GET_KLAVIYO_KEY": {
              const key = yield figma.clientStorage.getAsync("klaviyo_api_key");
              figma.ui.postMessage({ type: "KLAVIYO_KEY_LOADED", key: key != null ? key : null });
              break;
            }
            case "CLOSE_PLUGIN": {
              figma.closePlugin();
              break;
            }
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          figma.ui.postMessage({ type: "ERROR", message });
        }
      });
      function computeSliceBands(frame, frameAbsY, frameHeight) {
        const raw = collectChildBands(frame.children, frameAbsY, frameHeight);
        if (raw.length <= 1 && frame.children.length === 1) {
          const only = frame.children[0];
          if ("children" in only) {
            const deeper = collectChildBands(only.children, frameAbsY, frameHeight);
            if (deeper.length > 1) raw.splice(0, raw.length, ...deeper);
          }
        }
        raw.sort((a, b) => a.y_start - b.y_start);
        const merged = [];
        for (const band of raw) {
          if (merged.length === 0) {
            merged.push(__spreadValues({}, band));
          } else {
            const last = merged[merged.length - 1];
            if (band.y_start <= last.y_end + 8) {
              last.y_end = Math.max(last.y_end, band.y_end);
            } else {
              merged.push(__spreadValues({}, band));
            }
          }
        }
        if (merged.length === 0) {
          return [{ name: "full_email", y_start: 0, y_end: frameHeight }];
        }
        merged[0].y_start = 0;
        for (let i = 0; i < merged.length - 1; i++) {
          const mid = Math.round((merged[i].y_end + merged[i + 1].y_start) / 2);
          merged[i].y_end = mid;
          merged[i + 1].y_start = mid;
        }
        merged[merged.length - 1].y_end = frameHeight;
        return merged;
      }
      function collectChildBands(children, frameAbsY, frameHeight) {
        const bands = [];
        for (const child of children) {
          if (!child.visible) continue;
          let bbox;
          try {
            bbox = child.absoluteBoundingBox;
          } catch (e) {
            continue;
          }
          if (!bbox) continue;
          const y_start = Math.max(0, Math.round(bbox.y - frameAbsY));
          const y_end = Math.min(frameHeight, Math.round(bbox.y - frameAbsY + bbox.height));
          if (y_end > y_start) {
            bands.push({ name: child.name, y_start, y_end });
          }
        }
        return bands;
      }
      function notifyAllPageFrames() {
        const frames = getAllEmailFrames();
        const data = frames.map((frame) => ({
          id: frame.id,
          name: frame.name,
          width: frame.width,
          height: frame.height,
          existingSliceData: loadSliceData(frame.id)
        }));
        figma.ui.postMessage({ type: "ALL_FRAMES_LOADED", data });
      }
    }
  });
  require_code();
})();
