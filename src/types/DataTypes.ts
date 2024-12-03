export interface Item {
  cardinal_direction: string | null;
  id_buoy: number;
  lat: number;
  longi: number;
  lat_str: string;
  longi_str: string;
  timestamp: string;
  units_simp: string;
  units_sint: string;
  value_simp: number;
  value_sint: number;
  vargen_desc: string;
  vargen_name: string;
  vargen_order: number;
  [key: string]: string | number | null | undefined;
}

export interface SidebarProps {
  onToggle: (click: string) => void;
  isActive: boolean;
  htmlDetailBouy: string;
  noData: boolean;
  mobile: boolean;
  bouysLoadMap: boolean;
  dataBuoy: Item[];
  measurementUnits: string;
  lastTimeStamp: string;
  lastBuoyTimeStamp: string;
  selectedNameBuoy: string;
  logoBuoy: { logopath: string; name_buoy: string }[];
  websiteType: string | null;
  lat_str: string;
  longi_str: string;
}
