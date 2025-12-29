import { demandData as data } from "./removedLockDownData.js";
import * as fs from "fs";

function referenceDay(time=Date.now()){
    return new Date(`1 jan 2020 ${new Date(time).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}`)
}

function mean(array) {
    const sum = array.reduce((acc, val) => acc + val, 0);
    return array.length === 0 ? NaN : sum / array.length;
  }

const meanTimeDemand={}
data.forEach(d=>{
    if(d.y>0.2){
        const reference=referenceDay(d.x).valueOf().toString()
        if(meanTimeDemand[reference])meanTimeDemand[reference].push(d.y)
            else meanTimeDemand[reference]=[d.y]
    }
})

const fithCentile=[]
const ninetyfithCentile=[]
const keys=Object.keys(meanTimeDemand)
keys.forEach(k=>{
    meanTimeDemand[k].sort()
    const numberOfDataPoints=meanTimeDemand[k].length
    const numberPointsFivePercent=Math.floor(numberOfDataPoints/20+0.5)
    fithCentile.push({x:parseInt(k),y:meanTimeDemand[k][numberPointsFivePercent]})
    ninetyfithCentile.push({x:parseInt(k),y:meanTimeDemand[k][meanTimeDemand[k].length-numberPointsFivePercent]})
})
fithCentile.sort((a,b)=>a.x-b.x)
ninetyfithCentile.sort((a,b)=>a.x-b.x)
const jsonString1 = JSON.stringify(fithCentile, null, 2); // `null, 2` makes it pretty-printed
const jsonString2 = JSON.stringify(ninetyfithCentile, null, 2); // `null, 2` makes it pretty-printed

// Write to file
fs.writeFile('fifthCentile.js', jsonString1, (err) => {
  if (err) {
    console.error('Error writing file:', err);
  } else {
    console.log('Successfully wrote to fifthCentile.js');
  }
});
// Write to file
fs.writeFile('ninetyfifthCentile.js', jsonString2, (err) => {
  if (err) {
    console.error('Error writing file:', err);
  } else {
    console.log('Successfully wrote to ninetyfifthCentile.js');
  }
});
