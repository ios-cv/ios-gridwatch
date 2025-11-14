import { LineChart, FixedScaleAxis } from "chartist"
import { averageSummerDay } from "./averageSummerDay"
import { averageWinterDay } from "./averageWinterDay"
import { averageDay } from "./averageDay"
import { highestDemand } from "./highestDemand"
import { lowestDemand } from "./lowestDemand"
import { twoSTDsAbove } from "./twoSTDsAbove"
import { twoSTDsBelow } from "./twoSTDsBelow"
import { roundUpToQuarterSignificant } from "./mathematicalFunctions"
import { initDropdown } from "./dropdown"
import { Float64RingBuffer } from "./ringBuffer"
import { server } from "./config.js"

let liveData={}
const sitePeriodData={}
const periods=[1,7,31,365]
const total=document.getElementById("total")
const daily=document.getElementById("daily")
const week=document.getElementById("week")
const year=document.getElementById("year")
const explainTotals=document.getElementById("explainTotals")
const current=document.getElementById("current")
const bestProduction=document.getElementById("bestProduction")
const rank=document.querySelector("#rank table tbody")
const explainRanks=document.getElementById("explainRanks")
const generationInPeriod=document.getElementById("generationInPeriod")
const siteDialog=document.getElementById("siteOverview")
const siteGraph=document.getElementById("siteGraph")
const siteSelection=document.getElementById("siteSelection")
const sites_carousel=document.getElementById("sites")
const glide_carousel=document.querySelector(".glide")
const config_carousel={
    type:"carousel",
    focusAt:"center",
    perView:3
}
const updateTimer={
    element:document.getElementById("timeToUpdate"),
    element2:document.getElementById("timeToUpdateOption"),
    time:59.9,
    eta:Date.now()+60000,
    interval:null,
    update:function(){
        this.time=(Math.round((this.eta-Date.now())/100)/10)
        if(this.time<-3600)
        {
            window.location.reload();
        }
        this.element.textContent=this.time.toFixed(1)
        this.element2.textContent=this.time.toFixed(1)
        const {width,height} =this.element.getBoundingClientRect()
        this.element.style.left = `calc(50% - ${width / 2}px)`
        this.element.style.top = `calc(50% - ${height / 2}px)`
    },
    start:function(){
        if(this.interval===null){
            this.newEta()
            this.interval=setInterval(()=>updateTimer.update(),100)
        }
        return this.interval
    },
    newEta:function(){
        this.eta=Date.now()+60000
    }
}
const sortingOptions=document.querySelectorAll("[name=sort]")
const demandGraph=document.getElementById("demandGraph")
const legend={
    average:document.getElementById("legend_average"),
    end:document.getElementById("legend_end"),
    now:document.getElementById("legend_now"),
    min:document.getElementById("legend_min"),
    max:document.getElementById("legend_max"),
    summer:document.getElementById("legend_summer"),
    winter:document.getElementById("legend_winter"),
    std:document.getElementById("legend_std"),
    solar:document.getElementById("legend_solar"),
    max_value:{
        average:averageDay.reduce((a,b)=>Math.max(a,b.y),0),
        min:lowestDemand.reduce((a,b)=>Math.max(a,b.y),0),
        max:highestDemand.reduce((a,b)=>Math.max(a,b.y),0),
        summmer:averageSummerDay.reduce((a,b)=>Math.max(a,b.y),0),
        winter:averageWinterDay.reduce((a,b)=>Math.max(a,b.y),0),
        standard_deviation:twoSTDsBelow.reduce((a,b)=>Math.max(a,b.y),0),
    }
}
const averagedDataTransitionX=referenceDay().valueOf()
const combinedSolarData=new Float64RingBuffer(3000)
const time=document.getElementById("time")
const averageDemand=document.getElementById("averageDemand")
const percentOfDemand=document.getElementById("percentOfDemand")

const letters=[..."abcdefghijklmnopqrstuvwxyz"]

const resizeSiteGraph=new ResizeObserver(drawSiteGraph)
const resizeDemandGraph=new ResizeObserver(drawAverageChart)
resizeSiteGraph.observe(siteGraph)
resizeDemandGraph.observe(demandGraph)
makeModal(siteDialog,null,"closeSiteOverview")
makeModal(explainTotals,"explainTotalsLink","closeExplainTotals")
makeModal(explainRanks,"explainRanksLink","closeExplainRanks")


//initialise state
fetchCombinedSolarData()

//render initial elements
drawAverageChart()

//RENDER FUNCTIONS 
function drawAverageChart(){
    if (document.hidden) return; //No need to draw the graph if the page isn't visible.
    legend.max_value.solar=combinedSolarData.getHighestY()
    const max_value=roundUpToQuarterSignificant(Math.max(
        legend.average.checked?legend.max_value.average:0,
        legend.solar.checked?legend.max_value.solar:0,
        legend.min.checked?legend.max_value.min:0,
        legend.max.checked?legend.max_value.max:0,
        legend.summer.checked?legend.max_value.summmer:0,
        legend.winter.checked?legend.max_value.winter:0,
        legend.std.checked?legend.max_value.standard_deviation:0
    ))
    const noLine=[{x:referenceDay(),y:0},{x:referenceDay().valueOf()+1,y:0}]
    const solarData=legend.solar.checked?combinedSolarData.getValues():noLine;
    const endLine=[{x:averagedDataTransitionX,y:max_value},{x:averagedDataTransitionX+100,y:0}]
    const nowLine=[{x:referenceDay(),y:max_value},{x:referenceDay().valueOf()+100,y:0}]
    const average={name:'Average Day',data:legend.average.checked?averageDay:noLine}
    const end={name:'pageLoad',data:legend.solar.checked&&legend.end.checked?endLine:noLine}
    const now={name:'Now',data:legend.now.checked?nowLine:noLine}
    const summer={name:'Average Summer',data:legend.summer.checked?averageSummerDay:noLine}
    const winter={name:'Average Winter',data:legend.winter.checked?averageWinterDay:noLine}
    const low={name:'Two Standard Deviations Below',data:legend.std.checked?twoSTDsBelow:noLine}
    const high={name:'Two Standard Deviations Above',data:legend.std.checked?twoSTDsAbove:noLine}
    const solar={name:'Solar',data:solarData}
    const lowest={name:'Lowest',data:legend.min.checked?lowestDemand:noLine}
    const highest={name:'Average Winter',data:legend.max.checked?highestDemand:noLine}

    if(demandGraph.graph){
        demandGraph.graph.update({
            series:[
                average,
                end,
                now,
                solar,
                summer,
                winter,
                lowest,
                highest, 
                high,
                low
            ]
        })
    }
    else{
        demandGraph.graph= new LineChart(
        '#demandGraph',{
            series:[
                average,
                end,
                now,
                solar,
                summer,
                winter,
                lowest,
                highest, 
                high,
                low
            ]
        },
        {
            axisX: {
            type: FixedScaleAxis,
            divisor: 12,
            labelInterpolationFnc: value =>
                new Date(value).toLocaleString(undefined, 
                    {hour:'numeric',
                    minute:'numeric'})
            },
            axisY:{
                labelInterpolationFnc: value=>`${value} MW`
            }
        }
        );
    }
    
}
function drawSiteGraph(){ 
    if (document.hidden) return; //No need to draw the graph if the page isn't visible.
    const checkedbox=document.querySelector('[name="period"]:checked')
    if(!checkedbox?.disabled){
        const period=checkedbox?.value
        //set labeling for graph according to length of the period
        let localeString={}
        if(period<=1){
            localeString.hour='numeric'
            localeString.minute='numeric'
            localeString.weekday='short'
        }else if(period<=7){
            localeString.weekday='short'
            localeString.day='numeric'
        }else{
            localeString.day='numeric'
            localeString.month='short'
        }
        const noLine=[{x:Date.now()-1,y:0},{x:Date.now(),y:0}]
        const series=[]
        if(Object.keys(sitePeriodData).length>0){
            sitePeriodData[period.toString()].forEach(site=>{
                const spacelessName=site.name.replaceAll(" ","")
                if(document.querySelector("#"+spacelessName+"_checkbox").checked){
                    series.push(site.data.map((d)=>{return{x:d[0],y:d[1]}}))
                }
                else{
                    series.push(noLine)
                }
            })
        }
        if(siteGraph.graph){
            siteGraph.graph.update({series})
        }
        else{
            siteGraph.graph= new LineChart(
            '#siteGraph',{
                series
            },
            {
                axisX: {
                type: FixedScaleAxis,
                divisor: 12,
                labelInterpolationFnc: value =>
                    new Date(value).toLocaleString(undefined, localeString)
                },
                axisY:{
                    labelInterpolationFnc: value=>`${value}`
                }
            }
            );
        }
    }
}

function updateDemand(currentGeneration){
    time.textContent=new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})
    const averageMW=demandAtTime(Date.now())
    averageDemand.textContent=formatWatts(averageMW*1000000)
    percentOfDemand.textContent=(currentGeneration/(averageMW*10)).toFixed(2)//averageMW * 10 = averageMW * 1000 / 100 = average_kW / 100 = 1%
    drawAverageChart()
}

function updateAggregated(){
    total.textContent=formatWatts(liveData["total_kwh"]*1000,true)
    current.textContent=formatWatts(liveData["current_w"])
    daily.textContent=formatWatts(liveData["day_kwh"]*1000,true)
    week.textContent=formatWatts(liveData["week_kwh"]*1000,true)
    year.textContent=formatWatts(liveData["year_kwh"]*1000,true)
}

function updateTable(){
    if(liveData.sites===null){
        return
    }
    const selected = document.querySelector('input[name="sort"]:checked');
    let option="generation"
    if (selected) {
        option=selected.value
    }
    switch(option){
        case "meter":
            liveData.sites.sort((a,b)=>b.today-a.today)
            break;
        case "max":
            liveData.sites.sort((a,b)=>b.max_percent-a.max_percent)
            break;
        case "generation":
        default:
            liveData.sites.sort((a,b)=>b.snapshot-a.snapshot)
            break;
    }
    while(rank.firstChild){
        rank.firstChild.remove()
    }
    liveData.sites.slice(0,6).forEach((site,i)=>{
        rank.append(createSiteRow(i+1,site))
    })
}

function updateSiteOverview() {
    const periodsWithData=[]
    const keys=Object.keys(sitePeriodData)
    keys.forEach(k=>{
        if(sitePeriodData[k][0].data)
        {
            periodsWithData.push(k)
        }
    })
    let firstAvaialble=null
    document.querySelectorAll("[name='period']").forEach(input => {
        if (!periodsWithData.includes(input.value)) {
            input.disabled = true
            input.checked=false
            input.parentElement.classList.add("disabled")
        } else {
            input.disabled = false
            input.parentElement.classList.remove("disabled")
            if(!firstAvaialble){
                firstAvaialble=input
            }
        }
    })
    let selectedPeriodCheckbox=document.querySelector("[name='period']:checked")
    if (!selectedPeriodCheckbox){
        selectedPeriodCheckbox=firstAvaialble
        firstAvaialble.checked=true
    }
    const selectedPeriod=selectedPeriodCheckbox===null?"1":selectedPeriodCheckbox.value.toString()
    const selectedSites=Array.from(document.querySelectorAll(".dropdown-option:has([type=checkbox]:checked)")).map(s=>s.textContent)
    const dataForPeriod=sitePeriodData[selectedPeriod.toString()][0].data;
    
    const lengthOfData=dataForPeriod.length;
    const lastDataPoint=dataForPeriod[lengthOfData-1];
    const ageOfData=Date.now()-lastDataPoint[0];
    let dataStale=3600000 // 1hr in ms
    switch (selectedPeriod){
        case "7":
            dataStale=3*3600000; //3hrs in ms
            break;
        case "31":
        case "365":
            dataStale=6*3600000; //6hrs in ms
            break;
        default:
            break;
    }
    if(ageOfData>dataStale){
        fetchOnePeriodData(selectedPeriod);
    }
    let generation_in_period=0
    let highest=0
    let bestSite=''
    sitePeriodData[selectedPeriod].forEach(site=>{
        const found=selectedSites.indexOf(site.name)
        if(found>=0){
            generation_in_period+=site.generation_in_period
            if(site.max>highest){
                highest=site.max
                bestSite=site.name
            }
        }
    })
    generationInPeriod.textContent=formatWatts(generation_in_period,true)
    bestProduction.textContent=`${bestSite} with ${formatWatts(highest)}`
    drawSiteGraph()
}

//EVENT LISTENERS
document.addEventListener("DOMContentLoaded",()=>{
    const eventSource=new EventSource(`${server}/sse`)

    //MAIN UPDATE EVENT
    eventSource.addEventListener("message",(e)=>{
        liveData=JSON.parse(e.data);
        if(liveData.sites && liveData.sites.length){
            liveData.sites.forEach((site)=>{
                site.max_percent=site.snapshot/site.max*100
            })
        }
        if(sites_carousel.firstElementChild){//if not first message

            updateTimer.newEta()
            liveData.sites.forEach((site,i) => {
                const spacelessName=site.name.replaceAll(" ","")
                sites_carousel.querySelectorAll(`.${spacelessName}-snapshot`).forEach(span=>{
                    span.textContent=formatWatts(site.snapshot)
                })
            });
            combinedSolarData.push({
                x:referenceDay(),
                y:liveData["current_w"]/1000000,
            })
        }
        else{ //if first message
            updateTimer.start()
            if(liveData['sites']?.length>0){
                const sortedSites=liveData['sites'].sort((a,b)=>b.snapshot-a.snapshot)
                sortedSites.forEach((site,i) => {
                    sites_carousel.append(createSiteCard(site))
                    siteSelection.append(createSiteSelector(site.name,letters[i]))
                    addBullet(glide_carousel)
                });
            }
            new Glide('.glide',config_carousel).mount()
            const cards=document.querySelectorAll('.site-card span.name').forEach(e=>{
                e.addEventListener('click',handleCardClick)
            })
            initDropdown();
            const dropDownOptions=document.querySelectorAll("[name='selectedSites']")
            dropDownOptions.forEach(d=>{
                d.addEventListener("change",handleSiteSelection)
            })
            fetchAllPeriodData(0)
        }
        updateTable();
        updateAggregated();
        updateDemand(parseFloat(liveData["current_w"])/1000)

    })
    window.addEventListener("beforeunload",()=>{
        eventSource.close()
    })
})

document.querySelectorAll('[name="period"]').forEach((s)=>{
    s.addEventListener('change',handlePeriodSelection)
})

sortingOptions.forEach(e=>{
    e.addEventListener("click",()=>{
        updateTable()
    })
})

document.querySelectorAll("[name=legend]").forEach(e=>{
    e.addEventListener("input",drawAverageChart)
})

document.getElementById("selectAllSites").addEventListener("click",()=>{setTimeout(updateSiteOverview,0)})

//ELEMENT FACTORIES
function createSiteRow(rank,siteData){
    const row=document.createElement('tr')
    const rankCell=document.createElement('td')
    const nameCell=document.createElement('td')
    const generationCell=document.createElement('td')
    const meterCell=document.createElement('td')
    const maxPercentCell=document.createElement('td')
    rankCell.textContent=rank
    const name=document.createElement('a')
    name.textContent=siteData.name
    name.classList.add("name")
    name.addEventListener("click",handleCardClick)
    nameCell.append(name)
    generationCell.textContent=formatWatts(siteData.snapshot)
    meterCell.textContent=formatWatts(siteData.today*1000,true)
    maxPercentCell.textContent=siteData.max_percent.toFixed(2)+"%"
    row.append(rankCell,nameCell,generationCell,meterCell,maxPercentCell)
    return row
}

function createSiteCard(siteData){
    const li=document.createElement('li')
    li.classList.add("site-card","glide__slide")
    const img=document.createElement('img')
    const name=document.createElement('span')
    name.classList.add('name')
    const obj=document.createElement('object')
    obj.setAttribute("data",`/imgs/${siteData.name}.png`)
    obj.type="image/png"
    img.src="/imgs/Canopy.svg"
    name.textContent=siteData.name
    name.setAttributeNS(null,'data-name',siteData.name)
    const span=document.createElement('span')
    span.classList.add("generation-total")
    const spacelessName=siteData.name.replaceAll(" ","")
    span.classList.add(`${spacelessName}-snapshot`)
    span.textContent=formatWatts(siteData.snapshot)
    obj.append(img)
    li.append(obj,name,span)
    return li
}

function createSiteSelector(siteName,seriesLetter){
    const label=document.createElement("label")
    label.textContent=siteName
    label.classList.add("dropdown-option",`ct-series-${seriesLetter}`)
    const checkbox=document.createElement("input")
    const spacelessName=siteName.replaceAll(" ","")
    checkbox.id=spacelessName+"_checkbox"
    label.setAttribute("for",spacelessName+"_checkbox")
    checkbox.name="selectedSites"
    checkbox.type="checkbox"
    label.append(checkbox)
    return label
}

function addBullet(glide_el){
    const bullets=glide_el.querySelector(".glide__bullets")
    const current_number=bullets.children.length
    const button=document.createElement("button")
    button.classList.add("glide__bullet")
    button.setAttributeNS(null,"data-glide-dir",`=${current_number}`)
    bullets.append(button)
}

function makeModal(el,openLinkId,closeLinkId){
    el.show=()=>el.classList.remove("display-none");
    el.close=()=>el.classList.add("display-none");
    if(openLinkId!=null) document.getElementById(openLinkId)?.addEventListener('click',el.show);
    if(closeLinkId!=null) document.getElementById(closeLinkId)?.addEventListener('click',el.close);
}

//Handle functions
function handleSiteSelection(){
    updateSiteOverview()
}

function handlePeriodSelection(){
    updateSiteOverview()
}
function handleCardClick(e){
    const siteName=e.currentTarget.textContent.replaceAll(" ","")
    document.getElementById(siteName+"_checkbox").setAttribute("checked","checked")
    updateSiteOverview()
    siteDialog.show()
}

//Fetch Functions
function fetchOnePeriodData(period){
    const address=`${server}/site/all/${period}`
    fetch(address).then((res)=>{
        res.json().then((data3)=>{
            if(data3.length>0){
                data3.forEach(d3=>{
                    if(d3.data){
                        d3.data.forEach(d=>d[0]*=1000)
                    }
                })
                sitePeriodData[period.toString()]=data3;
                drawSiteGraph();
            }
        })
    })
}

function fetchAllPeriodData(periodIndex){
    const address=`${server}/site/all/${periods[periodIndex]}`
    fetch(address).then((res)=>{
        res.json().then((data3)=>{
            if(data3.length>0){
                data3.forEach(d3=>{
                    if(d3.data){
                        d3.data.forEach(d=>d[0]*=1000)
                    }
                })
                sitePeriodData[periods[periodIndex].toString()]=data3;
                document.querySelector(`[name='period'][value='${periods[periodIndex]}']`).disabled=false;
                periodIndex++;
                if(periodIndex<periods.length){
                    fetchAllPeriodData(periodIndex)
                }
            }
        })
    })
}

function fetchCombinedSolarData(){
    fetch(`${server}/site/all`).then((res)=>{
        res.json().then((data3)=>{
            if(data3.values?.length>0){
                combinedSolarData.push(...data3.values.map(r=>{
                    return{
                        x:referenceDay(r[0]*1000).valueOf()-(15*60*1000),//Prometheus uses seconds so convert to milliseconds for js, also move the data point to the middle of the time period it represents
                        y:parseFloat(r[1]/1000000)//the supplied value is in watts, convert to MW for the graph
                    }
                }))
                //move the most recent point to the appropriate time on the graph
                const zero=combinedSolarData.getRecent(1).x+(15*60*1000)
                const lastAveragedPoint=zero+(referenceDay().valueOf()-zero)/2
                combinedSolarData.editRecent(0,{x:lastAveragedPoint})
                drawAverageChart()
            }
        })
    })
}

//Helper functions
function demandAtTime(pointInTime){
    const referenceTime=referenceDay(pointInTime)
    let index=0
    while(index<averageDay.length && referenceTime.valueOf()>new Date(averageDay[index].x).valueOf()){
        index++
    }
    if (index==0){//the time is 00:00
        return averageDay[index].y
    }
    const y1=averageDay[index-1].y
    const y2=averageDay[index].y
    const mins=referenceTime.getMinutes()
    const xd=mins<30?mins:mins-30
    const changePerMinute=(y2-y1)/30
    return y1+xd*changePerMinute //linear interpolation
}

function referenceDay(time=Date.now()){
    return new Date(`1 jan 2020 ${new Date(time).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}`)
}

function formatWatts(watts,wattHour=false) {
    const units = ['W', 'kW', 'MW', 'GW'];
    let index = 0;
    let value = watts;
  
    while (value >= 1000 && index < units.length - 1) {
      value /= 1000;
      index++;
    }
  
    return `${value.toFixed(2)} ${units[index]}${wattHour?'h':''}`;
  }





