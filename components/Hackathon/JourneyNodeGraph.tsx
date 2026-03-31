// components/Hackathon/JourneyNodeGraph.tsx
import React from "react";
import Svg, { Circle, Line } from "react-native-svg";
import type { MapNode } from "../../types/map";

const GREEN = "#10B981";
const CYAN = "#00F0FF";
const DIM = "rgba(255,255,255,0.2)";
const AMBER = "#F59E0B";

interface Props {
  nodes: MapNode[];
  completedNodeIds: Set<string>;
  currentNodeId: string | null;
  width: number;
  height: number;
}

export function JourneyNodeGraph({
  nodes,
  completedNodeIds,
  currentNodeId,
  width,
  height,
}: Props) {
  if (nodes.length === 0) return null;

  const PADDING = 20;
  const usableWidth = width - PADDING * 2;
  const centerY = height / 2;
  const amplitude = height * 0.28;

  const positions = nodes.map((_, i) => {
    const t = nodes.length === 1 ? 0.5 : i / (nodes.length - 1);
    const x = PADDING + t * usableWidth;
    const y = centerY + (i % 2 === 0 ? -amplitude : amplitude);
    return { x, y };
  });

  function nodeColor(node: MapNode): string {
    if (completedNodeIds.has(node.id)) return GREEN;
    if (node.id === currentNodeId) return CYAN;
    if (node === nodes[nodes.length - 1]) return AMBER;
    return DIM;
  }

  function isCompleted(node: MapNode) {
    return completedNodeIds.has(node.id);
  }

  function isCurrent(node: MapNode) {
    return node.id === currentNodeId;
  }

  return (
    <Svg width={width} height={height}>
      {nodes.slice(0, -1).map((node, i) => {
        const from = positions[i]!;
        const to = positions[i + 1]!;
        const bothDone = isCompleted(node) && isCompleted(nodes[i + 1]!);
        const fromDone = isCompleted(node) && isCurrent(nodes[i + 1]!);
        const solid = bothDone || fromDone;
        return (
          <Line
            key={`line-${i}`}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke={solid ? GREEN : "rgba(255,255,255,0.15)"}
            strokeWidth={1.5}
            strokeDasharray={solid ? undefined : "4,4"}
            opacity={solid ? 0.7 : 1}
          />
        );
      })}
      {nodes.map((node, i) => {
        const pos = positions[i]!;
        const color = nodeColor(node);
        const done = isCompleted(node);
        const current = isCurrent(node);
        if (current) {
          return (
            <React.Fragment key={node.id}>
              <Circle cx={pos.x} cy={pos.y} r={12} fill="rgba(0,240,255,0.12)" />
              <Circle cx={pos.x} cy={pos.y} r={9} fill="none" stroke={CYAN} strokeWidth={2} />
              <Circle cx={pos.x} cy={pos.y} r={4} fill={CYAN} />
            </React.Fragment>
          );
        }
        if (done) {
          return (
            <Circle key={node.id} cx={pos.x} cy={pos.y} r={8} fill={GREEN} opacity={0.9} />
          );
        }
        return (
          <Circle
            key={node.id}
            cx={pos.x}
            cy={pos.y}
            r={7}
            fill="none"
            stroke={color}
            strokeWidth={1.5}
            opacity={0.5}
          />
        );
      })}
    </Svg>
  );
}
