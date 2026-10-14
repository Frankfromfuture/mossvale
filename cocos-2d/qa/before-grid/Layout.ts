export type Rect = {x:number;z:number;w:number;d:number};
export type PlaceSpot = {id:string;name:string;short:string;x:number;z:number;open:number;close:number;indoor:boolean;activity:string;label:string;icon:string;cost:number};
export type TownLayout = {version:number;bounds:{minX:number;maxX:number;minZ:number;maxZ:number};spawn:{x:number;z:number};places:PlaceSpot[];paths:number[][];trees:number[][];cottages:Rect[];obstacles:Rect[];actors:{id:string;name:string;type:string;place:string;col:number;row:number}[]};
export type ObjectDefinition={id:string;name:string;category:string;sprite:string;size:{w:number;d:number};material:string;mass:number;maxHealth:number;blocking:boolean;movable:boolean;opaque:boolean;range:number;actions:string[];defaultAction:string;initial:Record<string,any>;surface?:boolean;render?:{w:number;d:number};closedSprite?:string;openSprite?:string};
export type ObjectInstance={id:string;defId:string;x:number;z:number;rotation:number;owner:string;group:string;parentId:string|null;state?:Record<string,any>;revision?:number};
export type ObjectEntity=ObjectDefinition&ObjectInstance&{state:Record<string,any>;revision:number};
export type ObjectCatalog={version:number;schema:string;definitions:Record<string,ObjectDefinition>;instances:ObjectInstance[]};
export type ObjectWorld={version:number;revision:number;navRevision:number;patches:Record<string,Partial<ObjectInstance>>};
