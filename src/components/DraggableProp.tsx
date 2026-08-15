import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Image, ImageSource } from 'expo-image';
import * as Haptics from 'expo-haptics';

interface Box {
  x: number; // 0-1 fraction of scene width
  y: number;
  w: number;
  h: number;
}

interface Props {
  startBox: Box;
  /** Ref to the (already-rendered, e.g. via percentage position) drop
   * target view — measured live at release time instead of computed in
   * advance, so this never depends on knowing the scene's actual pixel
   * size (see the note below on why that mattered). */
  targetRef: React.RefObject<View | null>;
  /** A real cropped image to drag — takes precedence over `icon` when set. */
  imageSource?: ImageSource;
  /** Emoji fallback, used when no imageSource is given. When neither this
   * nor imageSource is given, the drag handle is invisible (no shadowed
   * box, no glyph) — for props whose art is already part of the scene
   * background, where a placeholder icon on top would just be a redundant,
   * button-looking blob sitting over the real art. */
  icon?: string;
  onDropped: () => void;
  /** Fired on pointerdown/pointerup(-or-cancel) so a parent ScrollView can
   * disable scrolling for the duration of the drag — see the note above
   * handlePointerDown for why CSS touch-action alone isn't enough on
   * native. */
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

// Some cross-platform/cross-version defensiveness: RN's Pointer Event
// nativeEvent shape can expose either the W3C names (clientX/clientY) or
// the legacy touch-event names (pageX/pageY) depending on platform and RN
// version. Try both rather than betting on one.
function pointerPosition(nativeEvent: any): { x: number; y: number } {
  return {
    x: nativeEvent.pageX ?? nativeEvent.clientX ?? 0,
    y: nativeEvent.pageY ?? nativeEvent.clientY ?? 0,
  };
}

/** A draggable prop that starts at `startBox` (percentage-positioned, same
 * as hotspots) and can be dragged anywhere, calling onDropped if released
 * over `targetRef`'s current on-screen bounds, or springing back to start
 * otherwise.
 *
 * Uses raw onPointerDown/onPointerMove/onPointerUp instead of PanResponder
 * — verified directly against the rendered DOM that PanResponder's
 * panHandlers (the legacy RN "Responder System" props:
 * onStartShouldSetResponder, onResponderMove, etc.) were not being attached
 * to the element at all in this RN/react-native-web version combination, so
 * dragging silently never registered. Native W3C Pointer Events are
 * supported directly by modern React Native across both web and native, no
 * translation layer involved.
 *
 * Positioning is percentage-based and hit-testing uses a live
 * `measureInWindow` call rather than pre-computed pixel math from
 * `useWindowDimensions()` — an earlier version assumed the scene box's
 * pixel width equals the window's width, which breaks under SafeAreaView's
 * default insets on left/right (this app is landscape-locked, so a side
 * notch/camera-cutout inset is common), throwing off both the resting
 * position and the drop hit-test. Measuring the real target and comparing
 * against the release touch's actual page coordinates sidesteps that
 * entirely — both are true, live values, not estimates. */
export function DraggableProp({ startBox, targetRef, imageSource, icon, onDropped, onDragStart, onDragEnd }: Props) {
  const pan = useRef(new Animated.ValueXY()).current;
  const settle = useRef(new Animated.Value(1)).current; // opacity/scale on a successful drop
  const currentPan = useRef({ x: 0, y: 0 });
  const gestureStart = useRef({ x: 0, y: 0 }); // pointer's own page position at pointerdown
  const panAtGestureStart = useRef({ x: 0, y: 0 }); // pan's value at that same moment
  // On web, pointermove fires on plain hover too, not just while pressed —
  // without this guard, hovering (with gestureStart/panAtGestureStart still
  // at their zeroed defaults) jumped the sprite to a huge bogus offset,
  // looking like it vanished.
  const dragging = useRef(false);

  useEffect(() => {
    const id = pan.addListener((value) => {
      currentPan.current = value;
    });
    return () => pan.removeListener(id);
  }, [pan]);

  const handlePointerDown = (e: any) => {
    dragging.current = true;
    const { x, y } = pointerPosition(e.nativeEvent);
    gestureStart.current = { x, y };
    panAtGestureStart.current = { ...currentPan.current };
    Haptics.selectionAsync();
    onDragStart?.();
    // Web-only: keeps move events targeting this element even once the
    // pointer moves outside its original bounds — without this, the
    // browser would start routing moves to whatever's under the cursor
    // instead. No-ops harmlessly on native, where touch routing already
    // works this way by default.
    try {
      e.currentTarget?.setPointerCapture?.(e.nativeEvent.pointerId);
    } catch {
      // Some pointer ids/targets can't be captured — safe to ignore, the
      // drag still works, it just won't survive leaving the element's
      // original bounds on web.
    }
  };

  const handlePointerMove = (e: any) => {
    if (!dragging.current) return;
    const { x, y } = pointerPosition(e.nativeEvent);
    pan.setValue({
      x: panAtGestureStart.current.x + (x - gestureStart.current.x),
      y: panAtGestureStart.current.y + (y - gestureStart.current.y),
    });
  };

  const handlePointerUp = (e: any) => {
    if (!dragging.current) return;
    dragging.current = false;
    onDragEnd?.();
    const { x: pageX, y: pageY } = pointerPosition(e.nativeEvent);
    targetRef.current?.measureInWindow((tx, ty, tw, th) => {
      // Generous padding around the measured target — this is a "did you
      // mean to drop it here" check, not a precision task.
      const padX = tw * 0.4;
      const padY = th * 0.4;
      const hit = pageX >= tx - padX && pageX <= tx + tw + padX && pageY >= ty - padY && pageY <= ty + th + padY;
      if (hit) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Animated.timing(settle, { toValue: 0, duration: 220, useNativeDriver: false }).start(() => onDropped());
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false, friction: 7 }).start();
      }
    });
  };

  const handlePointerCancel = () => {
    if (!dragging.current) return;
    dragging.current = false;
    onDragEnd?.();
    Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false, friction: 7 }).start();
  };

  const hasVisual = Boolean(imageSource || icon);

  return (
    <Animated.View
      style={[
        styles.drag,
        hasVisual && styles.dragVisual,
        webNoDragStyle,
        {
          left: `${startBox.x * 100}%`,
          top: `${startBox.y * 100}%`,
          width: `${startBox.w * 100}%`,
          height: `${startBox.h * 100}%`,
          opacity: settle,
          transform: [...pan.getTranslateTransform(), { scale: settle }],
        },
      ]}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      {imageSource ? (
        // draggable={false} is load-bearing on web: <img> elements are
        // natively draggable by default (unlike any other element), so a
        // real mouse/touch drag starting on the image gets hijacked into
        // the browser's own "drag this image out" ghost-preview behavior —
        // which stops firing pointermove entirely, so the custom drag
        // above never tracks. Verified directly that an onDragStart
        // handler on the wrapping View gets silently dropped by
        // react-native-web (same class of issue as the PanResponder bug
        // fixed earlier); this prop, by contrast, is confirmed to reach the
        // underlying <img> element.
        <Image source={imageSource} style={styles.image} contentFit="cover" draggable={false} />
      ) : icon ? (
        <Text style={styles.icon}>{icon}</Text>
      ) : null}
    </Animated.View>
  );
}

// Web-only CSS, not part of RN's style types (see webDragBlockProps above
// for why these are needed) — kept separate from `styles` so the typed
// StyleSheet.create block below doesn't need its own escape hatch.
// touchAction: 'none' is the mobile-web half of the scroll-vs-drag fix: by
// default the browser treats a touch-and-move on this element as a page
// pan/scroll gesture and starts scrolling the ancestor ScrollView before
// our pointermove handler ever sees the movement. Telling the browser this
// element has no native touch gesture of its own hands the whole gesture to
// our JS handlers instead. (The native iOS/Android half is the
// onDragStart/onDragEnd callbacks above, which the screen uses to toggle
// the ScrollView's own scrollEnabled — touch-action has no native
// equivalent.)
const webNoDragStyle: any = { userSelect: 'none', WebkitUserDrag: 'none', touchAction: 'none' };

const styles = StyleSheet.create({
  drag: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
  },
  // Reads as "lifted off the surface" while dragging — a plain image
  // sitting flush with the background wouldn't look like a separate,
  // movable object. Skipped entirely for invisible (no imageSource/icon)
  // drag handles, where there's no surface to lift off of.
  dragVisual: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 6,
  },
  image: { width: '100%', height: '100%', borderRadius: 4 },
  icon: { fontSize: 22 },
});
