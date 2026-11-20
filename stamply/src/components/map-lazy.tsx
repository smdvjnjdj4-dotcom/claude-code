"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "./ui";

export const LazyMap = dynamic(() => import("./map-view"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full" />,
});
