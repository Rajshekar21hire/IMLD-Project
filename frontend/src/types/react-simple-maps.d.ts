declare module 'react-simple-maps' {
  import * as React from 'react';

  export interface GeoEntry {
    rsmKey: string;
    properties: { name: string; [key: string]: unknown };
    [key: string]: unknown;
  }

  export interface GeographiesChildProps {
    geographies: GeoEntry[];
  }

  export interface ComposableMapProps {
    projection?: string;
    projectionConfig?: { scale?: number; center?: [number, number]; [key: string]: unknown };
    style?: React.CSSProperties;
    width?: number;
    height?: number;
    children?: React.ReactNode;
  }

  export interface ZoomableGroupProps {
    zoom?: number;
    center?: [number, number];
    minZoom?: number;
    maxZoom?: number;
    onMoveEnd?: (pos: { coordinates: [number, number]; zoom: number }) => void;
    onMoveStart?: (pos: { coordinates: [number, number]; zoom: number }) => void;
    children?: React.ReactNode;
  }

  export interface GeographiesProps {
    geography: string | object;
    children: (props: GeographiesChildProps) => React.ReactNode;
  }

  export interface GeographyStyle {
    outline?: string;
    filter?: string;
    cursor?: string;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
  }

  export interface GeographyProps {
    geography: GeoEntry;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    style?: {
      default?: GeographyStyle;
      hover?: GeographyStyle;
      pressed?: GeographyStyle;
    };
    onMouseEnter?: (event: React.MouseEvent<SVGPathElement>) => void;
    onMouseMove?: (event: React.MouseEvent<SVGPathElement>) => void;
    onMouseLeave?: (event: React.MouseEvent<SVGPathElement>) => void;
    onClick?: (event: React.MouseEvent<SVGPathElement>) => void;
    key?: string;
  }

  export interface MarkerProps {
    coordinates: [number, number];
    children?: React.ReactNode;
  }

  export const ComposableMap: React.FC<ComposableMapProps>;
  export const ZoomableGroup: React.FC<ZoomableGroupProps>;
  export const Geographies: React.FC<GeographiesProps>;
  export const Geography: React.FC<GeographyProps>;
  export const Marker: React.FC<MarkerProps>;
}
