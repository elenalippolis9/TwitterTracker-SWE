const Chart = require('chart.js')

let showedCount = {}

let chartTemplate = {
    type: 'bar',
    data: {
        datasets: [{
            data: [],
            backgroundColor: 'rgba(29,161,242,200)'
        }]
    },
    options: {
        title: {
            display: true,
            text: "Number of tweets per second"
        },
        maintainAspectRatio: false,
        responsive:true,
        lineWidth: 0,
        layout: {
            padding: {
                left: 30,
                right: 30,
                top: 20,
                bottom: 20
            },
        },
        legend: {
            display: false
        },
        scales: {
            xAxes: [{
                ticks: {
                    maxRotation: 0,
                    autoSkip: true,
                    autoSkipPadding: 300,
                },
                type: 'time',
                offset: true,
                time: {
                    unit: 'seconds',
                    displayFormats: {
                        seconds: 'D MMM h:mm:ss a',
                        minutes: 'D MMM h:mm a',
                        hours: 'D MMM h a',
                    }
                },
                gridLines: {
                    lineWidth: 0,
                    drawTicks: true
                }
            }],
            yAxes: [{
                ticks: {
                    beginAtZero: true,
                },
                gridLines: {
                    lineWidth: 0,
                },
            }]
        },
    }
}
let timeChart;



exports.initialize = function() {
    let ctx = document.getElementById("timeChart").getContext('2d');
    timeChart = new Chart (ctx, chartTemplate)
    setScaleLevel(0);
}

exports.newChunk = function (chunk) {

    for (let tweetI in chunk.tweets) {
        let tweet = chunk.tweets[tweetI];
        countTweet(tweet);
    }

    timeChart.data.datasets[0].data = counts[scaleLevel]
    updateScale()
    timeChart.update()
}

function updateScale() {

    let targetCount = counts[scaleLevel];
    if (targetCount[0]) {

        let startTime = targetCount[0].t;
        let endTime = targetCount[targetCount.length-1].t;
        let timeDiff = -(endTime-startTime)/1000;

        // console.log("Time diff", timeDiff)
        let factor = 1/(60*scaleLevel)
        if (scaleLevel===0) factor = 1;
        let currentScaleDivisions = Math.abs(timeDiff*factor);
        // console.log('Scale divisions', currentScaleDivisions)
        if (currentScaleDivisions>80) {
            if (currentScaleDivisions>1600) {
                setScaleLevel(Math.min(2, scaleLevel+2))
            } else {
                setScaleLevel(Math.min(2, scaleLevel+1))
            }
        }
    }
}

// Count levels: seconds| minutes | hours
let counts = [[], [], []]
// Defines the showed scale, also corresponding to the index of counts
let scaleLevel = -1;

function setScaleLevel(newScaleLevel) {
    if (scaleLevel!==newScaleLevel) {
        if (scaleLevel<newScaleLevel) {
            scaleLevel = newScaleLevel;
            let graphScale = ""
            switch (newScaleLevel) {
                case 0: { graphScale = "seconds"; break}
                case 1: { graphScale = "minutes"; break}
                case 2: { graphScale = "hours"; break}
            }
            timeChart.options.scales.xAxes[0].time.unit = graphScale;
            timeChart.data.datasets[0].data = counts[newScaleLevel];
            timeChart.options.title.text = 'Number of tweets per ' + graphScale.substr(0, graphScale.length-1);
            timeChart.update();
        } else {
            console.warn("Decreasing the scale level during execution is not supported");
        }
    }
}

// Removes the insignificant parts of a time based on the timescale level
function stripScaleTime(time, scaleLvl) {
    let t = new Date(time);
    if (scaleLvl > 0) {
        t.setSeconds(0);
        if (scaleLvl > 1) {
            t.setMinutes(0);
        }
    }
    return t;
}

function countTweet(tweet) {


    for (let i = scaleLevel; i <= 2; i++) {

        let targetCount = counts[i];
        let targetLastDivisionCount = targetCount[targetCount.length-1];
        let strippedTime = stripScaleTime(tweet.created_at, i);
        let isOldTimeDivision = (targetLastDivisionCount && strippedTime.getTime()===targetLastDivisionCount.t.getTime());

        if (isOldTimeDivision) {
            // Tweet needs to be added to the same bar
            targetCount[targetCount.length-1].y += 1;
        } else {
            // Tweet is part of a new time division
            targetCount.push({t: strippedTime, y: 1})
        }
    }



}



// function addSingleCount(dst_count, key, val, conflictBuffer) {
//     if (dst_count[key]) {
//         if (conflictBuffer) { addSingleCount(conflictBuffer, key, val)}
//         else { dst_count[key] += val; }
//     } else {
//         dst_count[key] = val;
//     }
// }
//
// function mergeCount(dst_count, src_count, okBuffer, conflictBuffer) {
//     for (let timeKey in src_count) {
//         if (dst_count[timeKey]) {
//             if (conflictBuffer) {
//                 addSingleCount(conflictBuffer, timeKey, src_count[timeKey]);
//             } else {
//                 addSingleCount(okBuffer, timeKey, src_count[timeKey])
//             }
//         } else {
//             addSingleCount(okBuffer, timeKey, src_count[timeKey])
//         }
//     }
// }
//
// DATA CALLBACKS =====================================================================================================

exports.newChunkCallback = function (chunk) {
    // console.log('New chunk callback: ', chunk)
    this.newChunk(chunk)
}

exports.newTweetCallback = function (tweet) {
    // console.log('New tweet callback: ', tweet)
}

exports.resetCallback = function (tweet) {
    scaleLevel = 0;
    counts = [[], [], []]
    timeChart.data.datasets[0].data = []
    updateScale();
    timeChart.update();
}