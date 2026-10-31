const seat=(id,x,z,angle,zone,owner=null)=>({id,x,z,angle,zone,owner,approach:{x:x+Math.sin(angle)*.97,z:z+Math.cos(angle)*.97}});
export const hallSeats=[
 seat('table-priest',-1.7,-13.7,0,'table','miyazaki'),seat('table-writer',0,-13.7,0,'table','ishikawa'),seat('table-wife',1.7,-13.7,0,'table','emi'),
 seat('table-keeper',-1.7,-8.3,Math.PI,'table','jiang'),seat('table-player',0,-8.3,Math.PI,'table','player'),seat('table-merchant',1.7,-8.3,Math.PI,'table','kato'),
 seat('left-a',-6,-2.8,0,'left'),seat('left-b',-4,-2.8,0,'left'),
 seat('right-a',4,-2.8,0,'right'),seat('right-b',6,-2.8,0,'right')
];
export const homeSeat=id=>hallSeats.find(s=>s.owner===id);
export const cornerSeats=zone=>hallSeats.filter(s=>s.zone===zone);
