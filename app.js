//we now implement 2 canvases, 1 for caching
//switching between the 2 will probably avoid having to redraw a bunch of lines

const targetCanvasSize = 500
const dpr = window.devicePixelRatio;
const ratio = targetCanvasSize/(32 / dpr);
const sliceDistance = 64;
const marginSize = 20;

let globalContextStorage = [];

const tree = new KDTree(4);
tree.root = root;

function init() {
    //the shit below removes blurry lines by scaling the canvas to the device pixel ratio
    //so thats the reason for the 3.333333
    // Get the DPR and size of the canvas
    var temp = document.getElementsByClassName("pain");
    for (var i = 0; i < temp.length; i++) {
      //const rect = temp[i].getBoundingClientRect();
  
      // Set the "actual" size of the canvas
      temp[i].width = 32;
      temp[i].height = 32;
      const ctx = temp[i].getContext("2d");
      // Scale the context to ensure correct drawing operations
      ctx.scale(dpr, dpr);
      ctx.willReadFrequently = true;

      globalContextStorage.push(ctx)
  
      // Set the "drawn" size of the canvas
      temp[i].style.width = `${32 / dpr}px`;
      temp[i].style.height = `${32 / dpr}px`;

      temp[i].style.transform = `scale( ${ratio} )`
    }
  
    const arr = [0, [1], [2], [1, 2], [4], [1, 4], [2, 4], [1, 2, 4]];
    window.onmousedown = (event) => {
      //console.log("mouse detected: down");
      var mouseButton = arr[event.buttons] || [];
  
      mX = event.clientX;
      mY = event.clientY;
  
      if (mouseButton.includes(1)) {
        mdown = true;
        drawbox(Math.round((mX - marginSize)/ ratio) , Math.round((mY - marginSize)/ ratio) , 2, 2, `rgb(255, 255, 255)`, 0, false);
      }
    };
    
    window.onmousemove = (event) => {
      //console.log("mouse detected: move");
      //var mouseButton = arr[event.buttons] || [];
      //const canvas = document.getElementById("paint");
      //var data = canvas.getBoundingClientRect();
  
      var mX = event.clientX;
      var mY = event.clientY;
  
      //document.getElementById('box').innerText = `data: ${JSON.stringify(data, null, 1)}` + `mx: ${mX}; my: ${mY}`
      if (mdown == true) {
        drawbox(Math.round((mX - marginSize)/ ratio) , Math.round((mY - marginSize)/ ratio) , 2, 2, `rgb(255, 255, 255)`, 0, false);
      }
    };

    window.onmouseup = (event) => {
      console.log("mouse detected: up");
      //var mouseButton = arr[event.buttons] || [];
  
      mouseX = event.clientX;
      mouseY = event.clientY;
  
      if (mdown == true) {
        mdown = false;
      }
      let k = globalContextStorage[0].getImageData(0, 0, 32, 32)
      let data = k.data;
      let data2 = data.slice(); // copy
      let data3 = data.slice(); // copy

      //sets the bottom right 4 pixels of data2 to true cause for some reason that makes it works better
      for (let i = 30; i < 32; i++) {
        for (let j = 30; j < 32; j++) {

          let idx = (i * 32 + j) << 2;
          data2[idx] = 255;
          data2[idx + 1] = 255;
          data2[idx + 2] = 255;
          data2[idx + 3] = 255;
        }
      }

      //sets the top right 4 pixels fpr data 3
      for (let i = 0; i < 2; i++) {
        for (let j = 30; j < 32; j++) {
          let idx = (i * 32 + j) << 2;
          data3[idx] = 255;
          data3[idx + 1] = 255;
          data3[idx + 2] = 255;
          data3[idx + 3] = 255;
        }
      }

      data = centerImage(data);
      data = scaleImage(data, 28);
      data = centerImage(data);

      data2 = centerImage(data2);
      data2 = scaleImage(data2, 28);
      data2 = centerImage(data2);
      
      data3 = centerImage(data3);
      data3 = scaleImage(data3, 28);
      data3 = centerImage(data3);

      //k.data.set(data);
      //globalContextStorage[0].putImageData(k, 0, 0);
      
      let res = new Array(4).fill("")
      let res2 = new Array(4).fill("")
      let res3 = new Array(4).fill("")

      for(let pos of snakeCurve()){
        let idx = (pos[0] * 32 + pos[1]) << 2
        res[0] = String(Number(data[idx] != 0)) + res[0]
        res2[0] = String(Number(data2[idx] != 0)) + res2[0]
        res3[0] = String(Number(data3[idx] != 0)) + res3[0]
      }
      for(let pos of spiralCurve()){
        let idx = (pos[0] * 32 + pos[1]) << 2
        res[1] = String(Number(data[idx] != 0)) + res[1]
        res2[1] = String(Number(data2[idx] != 0)) + res2[1]
        res3[1] = String(Number(data3[idx] != 0)) + res3[1]
      }
      for(let pos of hilbertCurve()){
        let idx = (pos[0] * 32 + pos[1]) << 2
        res[2] = String(Number(data[idx] != 0)) + res[2]
        res2[2] = String(Number(data2[idx] != 0)) + res2[2]
        res3[2] = String(Number(data3[idx] != 0)) + res3[2]
      }
      for(let pos of zOrderCurve()){
        let idx = (pos[0] * 32 + pos[1]) << 2
        res[3] = String(Number(data[idx] != 0)) + res[3]
        res2[3] = String(Number(data2[idx] != 0)) + res2[3]
        res3[3] = String(Number(data3[idx] != 0)) + res3[3]
      }

      res = res.map(i => convertBase(i, 2, 16));
      res2 = res2.map(i => convertBase(i, 2, 16));
      res3 = res3.map(i => convertBase(i, 2, 16));

      let originalRes = [...res] //copy
      let originalRes2 = [...res2] //copy
      let originalRes3 = [...res3] //copy

      //neighbor 1 -> 8 : res1
      //neighbor 9 -> 16 : res2
      //neighbor 17 -> 24 : res3
      let neighbor1 = tree.findKNearestNeighbor(res, 50, (a, b) => {
          let str1 = subtractHex_middlePart(a[0], b[0], 64);
          let str2 = subtractHex_middlePart(a[1], b[1], 64);
          let str3 = subtractHex_middlePart(a[2], b[2], 64);
          let str4 = subtractHex_middlePart(a[3], b[3], 64);
          
          //let res = maxDistanceHex(str1, str2, str3, str4);
          let res = minDistanceHex(str1, str2, str3, str4);

          return res.slice(0, sliceDistance)
      })

      let neighbor2 = tree.findKNearestNeighbor(res, 50, (a, b) => {
          let str1 = subtractHex_middlePart(a[0], b[0], 32);
          let str2 = subtractHex_middlePart(a[1], b[1], 32);
          let str3 = subtractHex_middlePart(a[2], b[2], 32);
          let str4 = subtractHex_middlePart(a[3], b[3], 32);
          
          //let res = maxDistanceHex(str1, str2, str3, str4);
          let res = minDistanceHex(str1, str2, str3, str4);

          return res.slice(0, sliceDistance)
      })

      let neighbor3 = tree.findKNearestNeighbor(res, 50, (a, b) => {
          let str1 = subtractHex_middlePart(a[0], b[0], 16);
          let str2 = subtractHex_middlePart(a[1], b[1], 16);
          let str3 = subtractHex_middlePart(a[2], b[2], 16);
          let str4 = subtractHex_middlePart(a[3], b[3], 16);
          
          //let res = maxDistanceHex(str1, str2, str3, str4);
          let res = minDistanceHex(str1, str2, str3, str4);

          return res.slice(0, sliceDistance)
      })

      let neighbor4 = tree.findKNearestNeighbor(res, 50, (a, b) => {
          let str1 = subtractHex_middlePart(a[0], b[0], 80);
          let str2 = subtractHex_middlePart(a[1], b[1], 80);
          let str3 = subtractHex_middlePart(a[2], b[2], 80);
          let str4 = subtractHex_middlePart(a[3], b[3], 80);
          
          //let res = maxDistanceHex(str1, str2, str3, str4);
          let res = minDistanceHex(str1, str2, str3, str4);

          return res.slice(0, sliceDistance)
      })

      let neighbor5 = tree.findKNearestNeighbor(res, 50, (a, b) => {
          let str1 = subtractHex_middlePart(a[0], b[0], 64).split('').reverse().join('');
          let str2 = subtractHex_middlePart(a[1], b[1], 64).split('').reverse().join('');
          let str3 = subtractHex_middlePart(a[2], b[2], 64).split('').reverse().join('');
          let str4 = subtractHex_middlePart(a[3], b[3], 64).split('').reverse().join('');
          
          //let res = maxDistanceHex(str1, str2, str3, str4);
          let res = minDistanceHex(str1, str2, str3, str4);

          return res.slice(0, sliceDistance)
      })

      let neighbor6 = tree.findKNearestNeighbor(res, 50, (a, b) => {
          let str1 = subtractHex_middlePart(a[0], b[0], 32).split('').reverse().join('');
          let str2 = subtractHex_middlePart(a[1], b[1], 32).split('').reverse().join('');
          let str3 = subtractHex_middlePart(a[2], b[2], 32).split('').reverse().join('');
          let str4 = subtractHex_middlePart(a[3], b[3], 32).split('').reverse().join('');
          
          //let res = maxDistanceHex(str1, str2, str3, str4);
          let res = minDistanceHex(str1, str2, str3, str4);

          return res.slice(0, sliceDistance)
      })

      let neighbor7 = tree.findKNearestNeighbor(res, 50, (a, b) => {
          let str1 = subtractHex_middlePart(a[0], b[0], 16).split('').reverse().join('');
          let str2 = subtractHex_middlePart(a[1], b[1], 16).split('').reverse().join('');
          let str3 = subtractHex_middlePart(a[2], b[2], 16).split('').reverse().join('');
          let str4 = subtractHex_middlePart(a[3], b[3], 16).split('').reverse().join('');
          
          //let res = maxDistanceHex(str1, str2, str3, str4);
          let res = minDistanceHex(str1, str2, str3, str4);

          return res.slice(0, sliceDistance)
      })

      let neighbor8 = tree.findKNearestNeighbor(res, 50, (a, b) => {
        let str1 = subtractHex_middlePart(a[0], b[0], 80).split('').reverse().join('');
        let str2 = subtractHex_middlePart(a[1], b[1], 80).split('').reverse().join('');
        let str3 = subtractHex_middlePart(a[2], b[2], 80).split('').reverse().join('');
        let str4 = subtractHex_middlePart(a[3], b[3], 80).split('').reverse().join('');
        
        //let res = maxDistanceHex(str1, str2, str3, str4);
        let res = minDistanceHex(str1, str2, str3, str4);

        return res.slice(0, sliceDistance)
      })

      let neighbor9 = tree.findKNearestNeighbor(res, 50, (a, b) => {
          let str1 = subtractHex_middlePart(a[0], b[0], 64);
          let str2 = subtractHex_middlePart(a[1], b[1], 64);
          let str3 = subtractHex_middlePart(a[2], b[2], 64);
          let str4 = subtractHex_middlePart(a[3], b[3], 64);
          
          //let res = maxDistanceHex(str1, str2, str3, str4);
          let res = minDistanceHex(str1, str2, str3, str4);

          return res.slice(0, sliceDistance)
      })

      let neighbor10 = tree.findKNearestNeighbor(res2, 50, (a, b) => {
          let str1 = subtractHex_middlePart(a[0], b[0], 32);
          let str2 = subtractHex_middlePart(a[1], b[1], 32);
          let str3 = subtractHex_middlePart(a[2], b[2], 32);
          let str4 = subtractHex_middlePart(a[3], b[3], 32);
          
          //let res = maxDistanceHex(str1, str2, str3, str4);
          let res = minDistanceHex(str1, str2, str3, str4);

          return res.slice(0, sliceDistance)
      })

      let neighbor11 = tree.findKNearestNeighbor(res2, 50, (a, b) => {
          let str1 = subtractHex_middlePart(a[0], b[0], 16);
          let str2 = subtractHex_middlePart(a[1], b[1], 16);
          let str3 = subtractHex_middlePart(a[2], b[2], 16);
          let str4 = subtractHex_middlePart(a[3], b[3], 16);
          
          //let res = maxDistanceHex(str1, str2, str3, str4);
          let res = minDistanceHex(str1, str2, str3, str4);

          return res.slice(0, sliceDistance)
      })

      let neighbor12 = tree.findKNearestNeighbor(res2, 50, (a, b) => {
          let str1 = subtractHex_middlePart(a[0], b[0], 80);
          let str2 = subtractHex_middlePart(a[1], b[1], 80);
          let str3 = subtractHex_middlePart(a[2], b[2], 80);
          let str4 = subtractHex_middlePart(a[3], b[3], 80);
          
          //let res = maxDistanceHex(str1, str2, str3, str4);
          let res = minDistanceHex(str1, str2, str3, str4);

          return res.slice(0, sliceDistance)
      })

      let neighbor13 = tree.findKNearestNeighbor(res2, 50, (a, b) => {
          let str1 = subtractHex_middlePart(a[0], b[0], 64).split('').reverse().join('');
          let str2 = subtractHex_middlePart(a[1], b[1], 64).split('').reverse().join('');
          let str3 = subtractHex_middlePart(a[2], b[2], 64).split('').reverse().join('');
          let str4 = subtractHex_middlePart(a[3], b[3], 64).split('').reverse().join('');
          
          //let res = maxDistanceHex(str1, str2, str3, str4);
          let res = minDistanceHex(str1, str2, str3, str4);

          return res.slice(0, sliceDistance)
      })

      let neighbor14 = tree.findKNearestNeighbor(res2, 50, (a, b) => {
          let str1 = subtractHex_middlePart(a[0], b[0], 32).split('').reverse().join('');
          let str2 = subtractHex_middlePart(a[1], b[1], 32).split('').reverse().join('');
          let str3 = subtractHex_middlePart(a[2], b[2], 32).split('').reverse().join('');
          let str4 = subtractHex_middlePart(a[3], b[3], 32).split('').reverse().join('');
          
          //let res = maxDistanceHex(str1, str2, str3, str4);
          let res = minDistanceHex(str1, str2, str3, str4);

          return res.slice(0, sliceDistance)
      })

      let neighbor15 = tree.findKNearestNeighbor(res2, 50, (a, b) => {
          let str1 = subtractHex_middlePart(a[0], b[0], 16).split('').reverse().join('');
          let str2 = subtractHex_middlePart(a[1], b[1], 16).split('').reverse().join('');
          let str3 = subtractHex_middlePart(a[2], b[2], 16).split('').reverse().join('');
          let str4 = subtractHex_middlePart(a[3], b[3], 16).split('').reverse().join('');
          
          //let res = maxDistanceHex(str1, str2, str3, str4);
          let res = minDistanceHex(str1, str2, str3, str4);

          return res.slice(0, sliceDistance)
      })

      let neighbor16 = tree.findKNearestNeighbor(res2, 50, (a, b) => {
        let str1 = subtractHex_middlePart(a[0], b[0], 80).split('').reverse().join('');
        let str2 = subtractHex_middlePart(a[1], b[1], 80).split('').reverse().join('');
        let str3 = subtractHex_middlePart(a[2], b[2], 80).split('').reverse().join('');
        let str4 = subtractHex_middlePart(a[3], b[3], 80).split('').reverse().join('');
        
        //let res = maxDistanceHex(str1, str2, str3, str4);
        let res = minDistanceHex(str1, str2, str3, str4);

        return res.slice(0, sliceDistance)
      })

      let neighbor17 = tree.findKNearestNeighbor(res3, 50, (a, b) => {
          let str1 = subtractHex_middlePart(a[0], b[0], 64);
          let str2 = subtractHex_middlePart(a[1], b[1], 64);
          let str3 = subtractHex_middlePart(a[2], b[2], 64);
          let str4 = subtractHex_middlePart(a[3], b[3], 64);
          
          //let res = maxDistanceHex(str1, str2, str3, str4);
          let res = minDistanceHex(str1, str2, str3, str4);

          return res.slice(0, sliceDistance)
      })

      let neighbor18 = tree.findKNearestNeighbor(res3, 50, (a, b) => {
          let str1 = subtractHex_middlePart(a[0], b[0], 32);
          let str2 = subtractHex_middlePart(a[1], b[1], 32);
          let str3 = subtractHex_middlePart(a[2], b[2], 32);
          let str4 = subtractHex_middlePart(a[3], b[3], 32);
          
          //let res = maxDistanceHex(str1, str2, str3, str4);
          let res = minDistanceHex(str1, str2, str3, str4);

          return res.slice(0, sliceDistance)
      })

      let neighbor19 = tree.findKNearestNeighbor(res3, 50, (a, b) => {
          let str1 = subtractHex_middlePart(a[0], b[0], 16);
          let str2 = subtractHex_middlePart(a[1], b[1], 16);
          let str3 = subtractHex_middlePart(a[2], b[2], 16);
          let str4 = subtractHex_middlePart(a[3], b[3], 16);
          
          //let res = maxDistanceHex(str1, str2, str3, str4);
          let res = minDistanceHex(str1, str2, str3, str4);

          return res.slice(0, sliceDistance)
      })

      let neighbor20 = tree.findKNearestNeighbor(res3, 50, (a, b) => {
          let str1 = subtractHex_middlePart(a[0], b[0], 80);
          let str2 = subtractHex_middlePart(a[1], b[1], 80);
          let str3 = subtractHex_middlePart(a[2], b[2], 80);
          let str4 = subtractHex_middlePart(a[3], b[3], 80);
          
          //let res = maxDistanceHex(str1, str2, str3, str4);
          let res = minDistanceHex(str1, str2, str3, str4);

          return res.slice(0, sliceDistance)
      })

      let neighbor21 = tree.findKNearestNeighbor(res3, 50, (a, b) => {
          let str1 = subtractHex_middlePart(a[0], b[0], 64).split('').reverse().join('');
          let str2 = subtractHex_middlePart(a[1], b[1], 64).split('').reverse().join('');
          let str3 = subtractHex_middlePart(a[2], b[2], 64).split('').reverse().join('');
          let str4 = subtractHex_middlePart(a[3], b[3], 64).split('').reverse().join('');
          
          //let res = maxDistanceHex(str1, str2, str3, str4);
          let res = minDistanceHex(str1, str2, str3, str4);

          return res.slice(0, sliceDistance)
      })

      let neighbor22 = tree.findKNearestNeighbor(res3, 50, (a, b) => {
          let str1 = subtractHex_middlePart(a[0], b[0], 32).split('').reverse().join('');
          let str2 = subtractHex_middlePart(a[1], b[1], 32).split('').reverse().join('');
          let str3 = subtractHex_middlePart(a[2], b[2], 32).split('').reverse().join('');
          let str4 = subtractHex_middlePart(a[3], b[3], 32).split('').reverse().join('');
          
          //let res = maxDistanceHex(str1, str2, str3, str4);
          let res = minDistanceHex(str1, str2, str3, str4);

          return res.slice(0, sliceDistance)
      })

      let neighbor23 = tree.findKNearestNeighbor(res3, 50, (a, b) => {
          let str1 = subtractHex_middlePart(a[0], b[0], 16).split('').reverse().join('');
          let str2 = subtractHex_middlePart(a[1], b[1], 16).split('').reverse().join('');
          let str3 = subtractHex_middlePart(a[2], b[2], 16).split('').reverse().join('');
          let str4 = subtractHex_middlePart(a[3], b[3], 16).split('').reverse().join('');
          
          //let res = maxDistanceHex(str1, str2, str3, str4);
          let res = minDistanceHex(str1, str2, str3, str4);

          return res.slice(0, sliceDistance)
      })

      let neighbor24 = tree.findKNearestNeighbor(res3, 50, (a, b) => {
        let str1 = subtractHex_middlePart(a[0], b[0], 80).split('').reverse().join('');
        let str2 = subtractHex_middlePart(a[1], b[1], 80).split('').reverse().join('');
        let str3 = subtractHex_middlePart(a[2], b[2], 80).split('').reverse().join('');
        let str4 = subtractHex_middlePart(a[3], b[3], 80).split('').reverse().join('');
        
        //let res = maxDistanceHex(str1, str2, str3, str4);
        let res = minDistanceHex(str1, str2, str3, str4);

        return res.slice(0, sliceDistance)
      })

      let neighbor = neighbor1.concat(
        neighbor2, 
        neighbor3, 
        neighbor4, 
        neighbor5, 
        neighbor6, 
        neighbor7, 
        neighbor8,
        neighbor9,
        neighbor10,
        neighbor11,
        neighbor12,
        neighbor13,
        neighbor14,
        neighbor15,
        neighbor16,
        neighbor17,
        neighbor18,
        neighbor19,
        neighbor20,
        neighbor21,
        neighbor22,
        neighbor23,
        neighbor24
      ).sort((a, b) => {
        let ka = BigInt(`0x${a.dist}`)
        let kb = BigInt(`0x${b.dist}`)

        if(ka < kb) return -1;
        else return 1;
      })

      console.log("neighbor len: ", neighbor.length)

      let firstOccur = new Array(10).fill(-1)
      let total = 0;
      for(let i = 0; i < neighbor.length; i++){
        if(firstOccur[neighbor[i].point[4]] < 0) {
          firstOccur[neighbor[i].point[4]] = neighbor[i];
          total++;
          if(total == 10) break;
        }
      }
      

      let ml = 0;
      firstOccur = firstOccur.map((i, index) => {
        //add additional info like full scores
        let metric = []
        let tempFullScore = ""
        let a, b, c, d;
        if(!i.point){
          return { 
            "num": index, 
            "metric": undefined
          }
        }

        //metric.push( i.dist );
        let t = scoreFunc(i.point[0]);

        a = xorHex(i.point[0], originalRes[0]);
        b = xorHex(i.point[1], originalRes[1]);
        c = xorHex(i.point[2], originalRes[2]);
        d = xorHex(i.point[3], originalRes[3]);

        tempFullScore = remove0(compress(minDistanceHex(a, b, c, d)));
        metric.push(scoreFunc(tempFullScore));
        metric.push(metric.at(-1));
        metric.push(metric.at(-1));
        // metric.push(metric.at(-1) - t);
        // metric.push(metric.at(-1));
        // metric.push(metric.at(-1));

        tempFullScore = remove0(compress(maxDistanceHex(a, b, c, d)));
        metric.push(scoreFunc(tempFullScore));
        metric.push(metric.at(-1));
        metric.push(metric.at(-1));
        // metric.push(metric.at(-1) - t);
        // metric.push(metric.at(-1));
        // metric.push(metric.at(-1));

        tempFullScore = remove0(compress(totalDistanceHex(a, b, c, d)));
        metric.push(scoreFunc(tempFullScore));
        metric.push(metric.at(-1));
        metric.push(metric.at(-1));
        // metric.push(metric.at(-1) - t);
        // metric.push(metric.at(-1));
        // metric.push(metric.at(-1));

        //metric.push(metric.at(-4) + metric.at(-6));
        //metric.push(metric.at(-1) - 2 * t);

        a = specialFunction1(i.point[0], originalRes[0]);
        b = specialFunction1(i.point[1], originalRes[1]);
        c = specialFunction1(i.point[2], originalRes[2]);
        d = specialFunction1(i.point[3], originalRes[3]);

        tempFullScore = remove0(compress(minDistanceHex(a, b, c, d)));
        metric.push(scoreFunc(tempFullScore));
        metric.push(metric.at(-1) - t);

        tempFullScore = remove0(compress(maxDistanceHex(a, b, c, d)));
        metric.push(scoreFunc(tempFullScore));
        metric.push(metric.at(-1) - t);

        // tempFullScore = remove0(compress(totalDistanceHex(a, b, c, d)));
        // metric.push(scoreFunc(tempFullScore));
        // metric.push(metric.at(-1) - t);

        // metric.push(metric.at(-4) + metric.at(-6));
        // metric.push(metric.at(-1) - 2 * t);

        a = specialFunction2(i.point[0], originalRes[0]);
        b = specialFunction2(i.point[1], originalRes[1]);
        c = specialFunction2(i.point[2], originalRes[2]);
        d = specialFunction2(i.point[3], originalRes[3]);

        tempFullScore = remove0(compress(minDistanceHex(a, b, c, d)));
        metric.push(scoreFunc(tempFullScore));
        metric.push(metric.at(-1) - t);

        tempFullScore = remove0(compress(maxDistanceHex(a, b, c, d)));
        metric.push(scoreFunc(tempFullScore));
        metric.push(metric.at(-1) - t);

        // tempFullScore = remove0(compress(totalDistanceHex(a, b, c, d)));
        // metric.push(scoreFunc(tempFullScore));
        // metric.push(metric.at(-1) - t);

        //metric.push(metric.at(-4) + metric.at(-6));
        //metric.push(metric.at(-1) - 2 * t);

        a = xorHex(i.point[0], originalRes2[0]);
        b = xorHex(i.point[1], originalRes2[1]);
        c = xorHex(i.point[2], originalRes2[2]);
        d = xorHex(i.point[3], originalRes2[3]);

        tempFullScore = remove0(compress(minDistanceHex(a, b, c, d)));
        metric.push(scoreFunc(tempFullScore));
        metric.push(metric.at(-1));
        metric.push(metric.at(-1));
        // metric.push(metric.at(-1) - t);
        // metric.push(metric.at(-1));
        // metric.push(metric.at(-1));

        tempFullScore = remove0(compress(maxDistanceHex(a, b, c, d)));
        metric.push(scoreFunc(tempFullScore));
        metric.push(metric.at(-1));
        metric.push(metric.at(-1));
        // metric.push(metric.at(-1) - t);
        // metric.push(metric.at(-1));
        // metric.push(metric.at(-1));

        tempFullScore = remove0(compress(totalDistanceHex(a, b, c, d)));
        metric.push(scoreFunc(tempFullScore));
        metric.push(metric.at(-1));
        metric.push(metric.at(-1));
        // metric.push(metric.at(-1) - t);
        // metric.push(metric.at(-1));
        // metric.push(metric.at(-1));

        //metric.push(metric.at(-4) + metric.at(-6));
        //metric.push(metric.at(-1) - 2 * t);

        a = specialFunction1(i.point[0], originalRes2[0]);
        b = specialFunction1(i.point[1], originalRes2[1]);
        c = specialFunction1(i.point[2], originalRes2[2]);
        d = specialFunction1(i.point[3], originalRes2[3]);

        tempFullScore = remove0(compress(minDistanceHex(a, b, c, d)));
        metric.push(scoreFunc(tempFullScore));
        metric.push(metric.at(-1) - t);

        tempFullScore = remove0(compress(maxDistanceHex(a, b, c, d)));
        metric.push(scoreFunc(tempFullScore));
        metric.push(metric.at(-1) - t);

        // tempFullScore = remove0(compress(totalDistanceHex(a, b, c, d)));
        // metric.push(scoreFunc(tempFullScore));
        // metric.push(metric.at(-1) - t);

        // metric.push(metric.at(-4) + metric.at(-6));
        // metric.push(metric.at(-1) - 2 * t);

        a = specialFunction2(i.point[0], originalRes2[0]);
        b = specialFunction2(i.point[1], originalRes2[1]);
        c = specialFunction2(i.point[2], originalRes2[2]);
        d = specialFunction2(i.point[3], originalRes2[3]);

        tempFullScore = remove0(compress(minDistanceHex(a, b, c, d)));
        metric.push(scoreFunc(tempFullScore));
        metric.push(metric.at(-1) - t);

        tempFullScore = remove0(compress(maxDistanceHex(a, b, c, d)));
        metric.push(scoreFunc(tempFullScore));
        metric.push(metric.at(-1) - t);

        // tempFullScore = remove0(compress(totalDistanceHex(a, b, c, d)));
        // metric.push(scoreFunc(tempFullScore));
        // metric.push(metric.at(-1) - t);

        //metric.push(metric.at(-4) + metric.at(-6));
        //metric.push(metric.at(-1) - 2 * t);

        a = xorHex(i.point[0], originalRes3[0]);
        b = xorHex(i.point[1], originalRes3[1]);
        c = xorHex(i.point[2], originalRes3[2]);
        d = xorHex(i.point[3], originalRes3[3]);

        tempFullScore = remove0(compress(minDistanceHex(a, b, c, d)));
        metric.push(scoreFunc(tempFullScore));
        metric.push(metric.at(-1));
        metric.push(metric.at(-1));
        // metric.push(metric.at(-1) - t);
        // metric.push(metric.at(-1));
        // metric.push(metric.at(-1));

        tempFullScore = remove0(compress(maxDistanceHex(a, b, c, d)));
        metric.push(scoreFunc(tempFullScore));
        metric.push(metric.at(-1));
        metric.push(metric.at(-1));
        // metric.push(metric.at(-1) - t);
        // metric.push(metric.at(-1));
        // metric.push(metric.at(-1));

        tempFullScore = remove0(compress(totalDistanceHex(a, b, c, d)));
        metric.push(scoreFunc(tempFullScore));
        metric.push(metric.at(-1));
        metric.push(metric.at(-1));
        // metric.push(metric.at(-1) - t);
        // metric.push(metric.at(-1));
        // metric.push(metric.at(-1));

        //metric.push(metric.at(-4) + metric.at(-6));
        //metric.push(metric.at(-1) - 2 * t);

        a = specialFunction1(i.point[0], originalRes3[0]);
        b = specialFunction1(i.point[1], originalRes3[1]);
        c = specialFunction1(i.point[2], originalRes3[2]);
        d = specialFunction1(i.point[3], originalRes3[3]);

        tempFullScore = remove0(compress(minDistanceHex(a, b, c, d)));
        metric.push(scoreFunc(tempFullScore));
        metric.push(metric.at(-1) - t);

        tempFullScore = remove0(compress(maxDistanceHex(a, b, c, d)));
        metric.push(scoreFunc(tempFullScore));
        metric.push(metric.at(-1) - t);

        // tempFullScore = remove0(compress(totalDistanceHex(a, b, c, d)));
        // metric.push(scoreFunc(tempFullScore));
        // metric.push(metric.at(-1) - t);

        // metric.push(metric.at(-4) + metric.at(-6));
        // metric.push(metric.at(-1) - 2 * t);

        a = specialFunction2(i.point[0], originalRes3[0]);
        b = specialFunction2(i.point[1], originalRes3[1]);
        c = specialFunction2(i.point[2], originalRes3[2]);
        d = specialFunction2(i.point[3], originalRes3[3]);

        tempFullScore = remove0(compress(minDistanceHex(a, b, c, d)));
        metric.push(scoreFunc(tempFullScore));
        metric.push(metric.at(-1) - t);

        tempFullScore = remove0(compress(maxDistanceHex(a, b, c, d)));
        metric.push(scoreFunc(tempFullScore));
        metric.push(metric.at(-1) - t);

        // tempFullScore = remove0(compress(totalDistanceHex(a, b, c, d)));
        // metric.push(scoreFunc(tempFullScore));
        // metric.push(metric.at(-1) - t);

        //metric.push(metric.at(-4) + metric.at(-6));
        //metric.push(metric.at(-1) - 2 * t);

        ml = metric.length;
        return { 
          "num": i.point[4], 
          "metric": metric
        }
      })

      let occurSorted = (ml > 0) ? new Array(ml).fill("") : []
      occurSorted = occurSorted.map((i, index) => {
        let temp = (firstOccur.sort((a, b) => {
          if(!a.metric) return 1;
          if(!b.metric) return -1;
          if(a.metric[index] < b.metric[index]) return -1;
          else return 1;
        }).map(k => k.num))
        temp.push(`Metric index : ${index}`)
        return temp;
      })

      let scoreCount = new Array(10).fill(0);
      occurSorted.forEach(i => {
        for(let index = 0; index < 10; index++){
          let j = i[index];
          if(index == 0) scoreCount[j] += Math.round((10 - index) * 2);
          else if(index <= 2) scoreCount[j] += (10 - index);
          else if(index >= 8) scoreCount[j] -= Math.round((index) * 1.3);
          else scoreCount[j] += Math.round((10 - index) * 0.55)
        }
      })
      console.log(occurSorted)
      occurSorted = occurSorted.map(i => i.join(", ")).sort((a, b) => {
        if(a < b) return -1;
        else return 1;
      })

      scorePercent = softmax(scoreCount).map(i => {
        return Number((i * 100).toFixed(4));
      })

      
      let str = "";
      str += "Scores: " + scoreCount.join(", ") + "\n"
      //str += "Percentages: " + scorePercent.map(i => i + "%").join(", ") + "\n"

      let guesses = scoreCount
      .map((i, index) => [i, index])
      .filter(i => i[0] > 20)
      .sort((a, b) => {
        return b[0] - a[0]
      })
      .map(i => i[1])
      .join(", ")
      str += "Ranked guesses: " + guesses + "\n"

      str += "\nDebug info: (full list)\n"
      str += occurSorted.join("\n")

      document.getElementById("result").innerText = str
    };
}

function getTopLeftMostPixel(imageData){
  //arr is 32 * 32 * 4 imageData array
  //returns the top left most pixel

  let firstOccurRow = 0;
  let firstOccurCol = 0;

  let stop = false;
  for(let i = 0; i < 32; i++){
    for(let j = 0; j < 32; j++){
      if(imageData[(j * 32 + i) << 2] != 0) {
        firstOccurCol = i
        stop = true;
        break;
      };
    }
    if(stop) break;
  }

  stop = false;
  for(let i = 0; i < 32; i++){
    for(let j = 0; j < 32; j++){
      if(imageData[(i * 32 + j) << 2] != 0) {
        firstOccurRow = i
        stop = true;
        break;
      };
    }
    if(stop) break;
  }
  return [firstOccurRow, firstOccurCol];
}

function getBottomRightMostPixel(imageData){
  //arr is 32 * 32 * 4 imageData array
  //returns the top left most pixel

  let firstOccurRow = 0;
  let firstOccurCol = 0;

  let stop = false;
  for(let i = 31; i >= 0; i--){
    for(let j = 31; j >= 0; j--){
      if(imageData[(j * 32 + i) << 2] != 0) {
        firstOccurCol = i
        stop = true;
        break;
      };
    }
    if(stop) break;
  }

  stop = false;
  for(let i = 31; i >= 0; i--){
    for(let j = 31; j >= 0; j--){
      if(imageData[(i * 32 + j) << 2] != 0) {
        firstOccurRow = i
        stop = true;
        break;
      };
    }
    if(stop) break;
  }
  return [firstOccurRow, firstOccurCol];
}

function scaleImage(imageData, scaleTo = 28){
  //based on the top left and bottom right most pixels
  //max = 32 * 32
  let topLeft = getTopLeftMostPixel(imageData);
  let bottomRight = getBottomRightMostPixel(imageData);

  let width = bottomRight[0] - topLeft[0] + 1;
  let height = bottomRight[1] - topLeft[1] + 1;

  let scaleX = scaleTo / width;
  let scaleY = scaleTo / height;

  let scale = Math.min(scaleX, scaleY);
  if(scale <= 1) return imageData;

  let result = new Uint8ClampedArray(32 * 32 * 4).fill(0);
  for(let i = 0; i < 32; i++){
    for(let j = 0; j < 32; j++){
      let srcX = Math.floor(i / scale) + topLeft[0];
      let srcY = Math.floor(j / scale) + topLeft[1];
      if (srcX >= topLeft[0] && srcX <= (bottomRight[0] + 1) && srcY >= topLeft[1] && srcY <= (bottomRight[1] + 1)){ 
        let srcIdx = (srcX * 32 + srcY) << 2;
        let destIdx = (i * 32 + j) << 2;
        result[destIdx] = imageData[srcIdx];
        result[destIdx + 1] = imageData[srcIdx + 1];
        result[destIdx + 2] = imageData[srcIdx + 2];
        result[destIdx + 3] = imageData[srcIdx + 3];
      }
    }
  }

  return result;
}

function centerImage(imageData){
  //arr is 32 * 32 * 4 imageData array
  //returns the resulting array
  
  let topLeft = getTopLeftMostPixel(imageData);
  let bottomRight = getBottomRightMostPixel(imageData);
  //let desiredCenter = [topLeft[0] + Math.round((bottomRight[0] - topLeft[0]) / 2), topLeft[1] + Math.round((bottomRight[1] - topLeft[1]) / 2)];
  let width = bottomRight[0] - topLeft[0];
  let height = bottomRight[1] - topLeft[1];

  let newTopLeft = [16 - Math.round(width / 2), 16 - Math.round(height / 2)];

  console.log(topLeft, bottomRight, newTopLeft)

  let result = new Uint8ClampedArray(32 * 32 * 4).fill(0);
  for(let i = topLeft[0]; i <= bottomRight[0]; i++){
    for(let j = topLeft[1]; j <= bottomRight[1]; j++){
      let idx = (i * 32 + j) << 2;
      let newIdx = (((i - topLeft[0]) + newTopLeft[0]) * 32 + ((j - topLeft[1]) + newTopLeft[1])) << 2;
      result[newIdx] = Number(imageData[idx + 3] != 0) * 255;
      result[newIdx + 1] = Number(imageData[idx + 3] != 0) * 255;
      result[newIdx + 2] = Number(imageData[idx + 3] != 0) * 255;
      result[newIdx + 3] = Number(imageData[idx + 3] != 0) * 255;
    }
  }

  return result
}

const score = {
  //number of 1 of each character
  '0' : 0,
  '1' : 1,
  '2' : 1,
  '3' : 2,
  '4' : 1,
  '5' : 2,
  '6' : 2,
  '7' : 3,
  '8' : 1,
  '9' : 2,
  'a' : 2,
  'b' : 3,
  'c' : 2,
  'd' : 3,
  'e' : 3,
  'f' : 4
}

//added leniency, replace certain characters with closer ones with the same scores
//near f tho, round up to f
const replacements = {
  '1': '0', 
  '3': 'f', 
  '4': '0', 
  '2': '0', 
  '5': '3', 
  '6': '3', 
  '7': 'f', 
  '8': '0', 
  '9': '3', 
  'a': '3', 
  'b': 'f', 
  'c': '3', 
  'd': 'f', 
  'e': 'f'
};

function remove0(str){
  str = str.replace(/0/g, '')
  let str2 = str.replace(/f/g, '');
  let str3 = str.replace(/3/g, '');
  let c = str.length - str2.length
  let c2 = str.length - str3.length
  return str + ('3'.repeat(Math.floor(c2 * 0.3))) + ('f'.repeat(c + Math.floor(c * 0.3)));
}

function compress(str) {
  str = str.replace(/[1-9a-e]/g, char => replacements[char]);
  str.replace(/0f0/g, '000')
  str.replace(/030/g, '000')
  str.replace(/f0f/g, 'fff')
  str.replace(/f3f/g, 'fff')
  str.replace(/0330/g, '0000')
  return str;
}

function subtractHex_middlePart(hex1, hex2, charCount = 16) {
  //extract the middle part of hex1 and hex2
  //ratio = how much of the middle part is included
  //.5 = 16 characters

  //num2 is the key that we are searching for
  const middle = hex1.length >> 1;
  // const oldHex1 = hex1;
  // const oldHex2 = hex2;
  charCount = charCount >> 1;
  hex1 = hex1.slice(middle - charCount, middle + charCount);
  hex2 = hex2.slice(middle - charCount, middle + charCount);

  // Convert hexadecimal strings to BigInt
  try{
    const num1 = BigInt(`0x${hex1}`);
    const num2 = BigInt(`0x${hex2}`);

    // Perform subtraction
    // Perform xor instead of subtraction since it makes more sense here
    // also maybe faster

    /*
    Truth table (1 = bad)
    Database ---- Drawn ---- F
       0     ----   0   ---- 0
       0     ----   1   ---- 1
       1     ----   0   ---- 1
       1     ----   1   ---- 0
    */
    const result = (num1 ^ num2)//(num1 > num2) ? num1 - num2 : num2 - num1;

    // Convert the result back to a hexadecimal string
    // Handle negative results gracefully
    return compress(result.toString(16));
    // let str = result.toString(16);
    // let s = 0
    // for(let i = 0; i < str.length; i++){
    //   s += score[str[i]];
    // }
    // return s.toString(16);
  }catch(e){
    //console.log("oldHex1", oldHex1, "hex1", hex1, "oldHex2", oldHex2, "hex2", hex2)
    return 'f'.repeat(32)
  }
}

function softmax(arr){
  let sum = 0;
  for(let i = 0; i < arr.length; i++){
    sum += Math.exp(arr[i]);
    if(sum == NaN || sum == Infinity) return softmax(arr.map(i => i / 10));
  }
  return arr.map(i => Math.exp(i) / sum);
}

function scoreFunc(str){
  let s = 0
  for(let i = 0; i < str.length; i++){
    s += score[str[i]];
  }
  return s;
}

function specialFunction1(hex1, hex2){
  // Convert hexadecimal strings to BigInt
  if(!hex1 || hex1.length == 0) return hex2;
  if(!hex2 || hex2.length == 0) return hex1;
  const num1 = BigInt(`0x${hex1}`);
  const num2 = BigInt(`0x${hex2}`);

  // Perform subtraction
  const result = (~num1) & num2;

  // Convert the result back to a hexadecimal string
  // Handle negative results gracefully
  return result.toString(16);
}

function specialFunction2(hex1, hex2){
  // Convert hexadecimal strings to BigInt
  if(!hex1 || hex1.length == 0) return hex2;
  if(!hex2 || hex2.length == 0) return hex1;
  const num1 = BigInt(`0x${hex1}`);
  const num2 = BigInt(`0x${hex2}`);

  // Perform subtraction
  const result = (num1) & (~num2);

  // Convert the result back to a hexadecimal string
  // Handle negative results gracefully
  return result.toString(16);
}

function xorHex(hex1, hex2) {
  
  // Convert hexadecimal strings to BigInt
  if(!hex1 || hex1.length == 0) return hex2;
  if(!hex2 || hex2.length == 0) return hex1;
  const num1 = BigInt(`0x${hex1}`);
  const num2 = BigInt(`0x${hex2}`);

  // Perform subtraction
  const result = num1 ^ num2;

  // Convert the result back to a hexadecimal string
  // Handle negative results gracefully
  return result.toString(16);
}

function plusHex(hex1, hex2) {
  
  // Convert hexadecimal strings to BigInt
  const num1 = BigInt(`0x${hex1}`);
  const num2 = BigInt(`0x${hex2}`);

  // Perform subtraction
  const result = num1 + num2;

  // Convert the result back to a hexadecimal string
  // Handle negative results gracefully
  return result.toString(16);
}

function subtractHex(hex1, hex2) {

  // Convert hexadecimal strings to BigInt
  const num1 = BigInt(`0x${hex1}`);
  const num2 = BigInt(`0x${hex2}`);

  // Perform subtraction
  const result = (num1 > num2) ? num1 - num2 : num2 - num1;

  // Convert the result back to a hexadecimal string
  // Handle negative results gracefully
  return result.toString(16);
}

function totalDistanceHex(hex1, hex2, hex3, hex4){
  // Convert hexadecimal strings to BigInt
  const num1 = BigInt(`0x${hex1}`);
  const num2 = BigInt(`0x${hex2}`);
  const num3 = BigInt(`0x${hex3}`);
  const num4 = BigInt(`0x${hex4}`);

  // Perform subtraction
  const result = num1 + num2 + num3 + num4;

  // Convert the result back to a hexadecimal string
  // Handle negative results gracefully
  return result.toString(16);
}

function squareDistanceHex(hex1, hex2, hex3, hex4){
  // Convert hexadecimal strings to BigInt
  const num1 = BigInt(`0x${hex1}`);
  const num2 = BigInt(`0x${hex2}`);
  const num3 = BigInt(`0x${hex3}`);
  const num4 = BigInt(`0x${hex4}`);

  // Perform subtraction
  const result = num1 * num1 + num2 * num2 + num3 * num3 + num4 * num4;

  // Convert the result back to a hexadecimal string
  // Handle negative results gracefully
  return result.toString(16);
}

function xorDistanceHex(hex1, hex2, hex3, hex4){
  // Convert hexadecimal strings to BigInt
  const num1 = BigInt(`0x${hex1}`);
  const num2 = BigInt(`0x${hex2}`);
  const num3 = BigInt(`0x${hex3}`);
  const num4 = BigInt(`0x${hex4}`);

  // Perform subtraction
  const result = num1 ^ num2 ^ num3 ^ num4;

  // Convert the result back to a hexadecimal string
  // Handle negative results gracefully
  return result.toString(16);
}

function maxDistanceHex(hex1, hex2, hex3, hex4){
  // Convert hexadecimal strings to BigInt
  const num1 = BigInt(`0x${hex1}`);
  const num2 = BigInt(`0x${hex2}`);
  const num3 = BigInt(`0x${hex3}`);
  const num4 = BigInt(`0x${hex4}`);

  // Perform subtraction
  let result = num1;
  if(num2 > result) result = num2;
  if(num3 > result) result = num3;
  if(num4 > result) result = num4;

  // Convert the result back to a hexadecimal string
  // Handle negative results gracefully
  return result.toString(16);
}

function minDistanceHex(hex1, hex2, hex3, hex4){
  // Convert hexadecimal strings to BigInt
  const num1 = BigInt(`0x${hex1}`);
  const num2 = BigInt(`0x${hex2}`);
  const num3 = BigInt(`0x${hex3}`);
  const num4 = BigInt(`0x${hex4}`);

  // Perform subtraction
  let result = num1;
  if(num2 < result) result = num2;
  if(num3 < result) result = num3;
  if(num4 < result) result = num4;

  // Convert the result back to a hexadecimal string
  // Handle negative results gracefully
  return result.toString(16);
}

function bitDifference(hex1, hex2){
  let str1 = convertBase(hex1, 16, 2)
  let str2 = convertBase(hex2, 16, 2)

  if(str1.length < str2.length) str1 = "0".repeat(str2.length - str1.length) + str1;
  else if(str2.length < str1.length) str2 = "0".repeat(str1.length - str2.length) + str2;

  let sum = 0;
  for(let i = 0; i < str1.length; i++){
    if(str1[i] != str2[i]) sum++;
  }
  return sum;
}

var mdown = false;
  
function drawDot(x, y, radius, color, id, clear) {
    const ctx = globalContextStorage[id]
    if(clear) ctx.clearRect(0, 0, 32, 32)

    ctx.lineWidth = 1;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.beginPath();

    ctx.moveTo(Math.round(x + radius), Math.round(y));
    ctx.arc(x, y, radius, 0, 2 * Math.PI, true);
    ctx.stroke();
    ctx.fill();
}
  
function drawbox(x, y, width, height, color, id, clear) {
    const ctx = globalContextStorage[id]
    if(clear) ctx.clearRect(0, 0, 32, 32)

    ctx.lineWidth = 1;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.beginPath();

    ctx.fillRect(x, y, width, height);
    //ctx.stroke();
    //ctx.fill();
}
  
function clearCanvas(id) {
    globalContextStorage[id].clearRect(0, 0, 32, 32);
}

function rng(max, min, round){
  return (round) ? Math.round(Math.random() * (max - min) + min) : Math.random() * (max - min) + min
}
