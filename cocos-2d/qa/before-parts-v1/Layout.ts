export type Rect = {x:number;z:number;w:number;d:number};
export type PlaceSpot = {id:string;name:string;short:string;x:number;z:number;open:number;close:number;indoor:boolean;activity:string;label:string;icon:string;cost:number};
export type TownLayout = {version:number;bounds:{minX:number;maxX:number;minZ:number;maxZ:number};spawn:{x:number;z:number};places:PlaceSpot[];paths:number[][];trees:number[][];cottages:Rect[];obstacles:Rect[];actors:{id:string;name:string;type:string;place:string;col:number;row:number}[]};
