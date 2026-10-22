import React, { useState, useRef } from "react";
import { Loader2, ArrowDown } from "lucide-react";

export default function PullToRefresh({ onRefresh, children }) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);

  const THRESHOLD = 70;

  const onTouchStart = (e) => {
    const scroller = e.currentTarget.closest(".sb-content-scroll");
    const atTop = (scroller ? scroller.scrollTop : window.scrollY) === 0;
    if (atTop && !refreshing) {
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    }
  };

  const onTouchMove = (e) => {
    if (!pulling.current) return;
    const diff = e.touches[0].clientY - startY.current;
    if (diff > 0) {
      setPullDistance(Math.min(diff * 0.5, THRESHOLD * 1.5));
    }
  };

  const onTouchEnd = async () => {
    if (!pulling.current) return;
    pulling.current = false;
    if (pullDistance >= THRESHOLD) {
      setRefreshing(true);
      setPullDistance(THRESHOLD);
      try {
        await onRefresh();
      } catch (e) {}
      setRefreshing(false);
    }
    setPullDistance(0);
  };

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div
        className="flex items-center justify-center overflow-hidden transition-all duration-200"
        style={{ height: pullDistance }}
      >
        {refreshing ? (
          <Loader2 size={20} className="animate-spin text-[#2D5A43]" />
        ) : pullDistance > 0 ? (
          <ArrowDown
            size={20}
            className="text-[#2D5A43] transition-opacity"
            style={{ opacity: Math.min(pullDistance / THRESHOLD, 1) }}
          />
        ) : null}
      </div>
      {children}
    </div>
  );
}