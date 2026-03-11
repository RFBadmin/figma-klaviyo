"use strict";
(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
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
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
  function exportSlices(frameId, slices) {
    return __async(this, null, function* () {
      const frame = figma.getNodeById(frameId);
      if (!frame) throw new Error(`Frame ${frameId} not found`);
      const exports = [];
      for (const slice of slices) {
        const sliceHeight = slice.y_end - slice.y_start;
        const sliceFrame = figma.createFrame();
        sliceFrame.name = `_temp_slice_${slice.name}`;
        sliceFrame.resize(frame.width, sliceHeight);
        sliceFrame.x = frame.x;
        sliceFrame.y = frame.y + slice.y_start;
        sliceFrame.fills = [];
        sliceFrame.clipsContent = true;
        for (const child of frame.children) {
          const childNode = child;
          const childTop = childNode.y;
          const childBottom = childNode.y + childNode.height;
          if (childBottom > slice.y_start && childTop < slice.y_end) {
            const cloned = child.clone();
            sliceFrame.appendChild(cloned);
            cloned.y = childNode.y - slice.y_start;
          }
        }
        const exportSettings = {
          format: "PNG",
          constraint: { type: "SCALE", value: 2 }
          // 2x for retina
        };
        const bytes = yield sliceFrame.exportAsync(exportSettings);
        exports.push({
          id: slice.id,
          name: slice.name,
          image_base64: uint8ArrayToBase64(bytes),
          width: frame.width,
          height: sliceHeight
        });
        sliceFrame.remove();
      }
      return exports;
    });
  }
  var init_export = __esm({
    "src/utils/export.ts"() {
      "use strict";
    }
  });

  // src/utils/figma-api.ts
  function getSelectedEmailFrame() {
    const selection = figma.currentPage.selection;
    if (selection.length !== 1) return null;
    const node = selection[0];
    if (node.type !== "FRAME") return null;
    const frame = node;
    if (frame.width < 500 || frame.width > 700) return null;
    return frame;
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
      notifyFrameSelection();
      figma.on("selectionchange", () => {
        notifyFrameSelection();
      });
      figma.ui.onmessage = (msg) => __async(null, null, function* () {
        var _a, _b;
        try {
          switch (msg.type) {
            case "GET_SELECTED_FRAME": {
              notifyFrameSelection();
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
            case "EXPORT_SLICES": {
              const exports2 = yield exportSlices(msg.frameId, msg.slices);
              figma.ui.postMessage({ type: "EXPORT_COMPLETE", data: exports2 });
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
                name: (_b = (_a = figma.currentUser) == null ? void 0 : _a.name) != null ? _b : "Unknown"
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
      function notifyFrameSelection() {
        const frame = getSelectedEmailFrame();
        if (frame) {
          const existingData = loadSliceData(frame.id);
          figma.ui.postMessage({
            type: "FRAME_SELECTED",
            data: {
              id: frame.id,
              name: frame.name,
              width: frame.width,
              height: frame.height,
              existingSliceData: existingData
            }
          });
        } else {
          figma.ui.postMessage({ type: "NO_FRAME_SELECTED" });
        }
      }
    }
  });
  require_code();
})();
