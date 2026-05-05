import React from "react";
import { StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { PathStepCard } from "../JourneyBoard/PathStepCard";
import type { PathStep } from "../../types/journey";

interface CanvasNodeProps {
  step: PathStep;
  index: number;
  totalSteps: number;
  hasChildren: boolean;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onDragNearEdge?: (edge: "top" | "bottom") => void;
}

const DRAG_THRESHOLD = 60;
const SPRING_CONFIG = { damping: 20, stiffness: 200 };

export function CanvasNode({
  step,
  index,
  totalSteps,
  hasChildren,
  onReorder,
  onDragNearEdge,
}: CanvasNodeProps) {
  const translateY = useSharedValue(0);
  const isDragging = useSharedValue(false);
  const dragStartY = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: withSpring(isDragging.value ? 1.04 : 1, SPRING_CONFIG) },
    ],
    zIndex: isDragging.value ? 100 : 1,
    opacity: withSpring(isDragging.value ? 0.95 : 1),
  }));

  const panGesture = Gesture.Pan()
    .activateAfterLongPress(400)
    .onStart(() => {
      isDragging.value = true;
      dragStartY.value = translateY.value;
    })
    .onUpdate((e) => {
      translateY.value = dragStartY.value + e.translationY;

      if (onDragNearEdge && e.absoluteY < 80) {
        onDragNearEdge("top");
      }
    })
    .onEnd(() => {
      isDragging.value = false;
      const displacement = translateY.value - dragStartY.value;
      const slotsMoved = Math.round(displacement / DRAG_THRESHOLD);

      if (slotsMoved !== 0) {
        const toIndex = Math.max(0, Math.min(totalSteps - 1, index + slotsMoved));
        if (toIndex !== index) {
          onReorder(index, toIndex);
        }
      }

      translateY.value = withSpring(0, SPRING_CONFIG);
    });

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.wrapper, animatedStyle]}>
        <PathStepCard
          step={step}
          isLast={index === totalSteps - 1}
          hasChildren={hasChildren}
          index={index}
        />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 4,
  },
});
