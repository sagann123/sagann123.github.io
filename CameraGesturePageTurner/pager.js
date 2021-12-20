
/*
 * 設定類の初期化
 */
var pageDirection = localStorage.getItem("pageDirection");
if (!pageDirection) {
    pageDirection = "right";
}

var effect = localStorage.getItem("effect");
if (!effect) {
    effect = "right";
}

var sizeAdjust = localStorage.getItem("sizeAdjust");
if (!sizeAdjust) {
    sizeAdjust = "none";
}

var cameraDisplay = localStorage.getItem("cameraDisplay");
if (!cameraDisplay) {
    cameraDisplay = "none";
}

var reconizeLength = localStorage.getItem("reconizeLength");
if (!reconizeLength) {
    reconizeLength = 10;
}

var reconizeInterval = localStorage.getItem("reconizeInterval");
if (!reconizeInterval) {
    reconizeInterval = 500;
}
var intervalStart = 0;

const RESOLUTION_X = 10;
var resolution = { x: RESOLUTION_X, y: 1 };

/*
 * diffy初期化
 */
var diffy;
function startDiffy() {
    diffy = Diffy.create({
        resolution: resolution,
        sensitivity: 0.2,
        threshold: 25,
        debug: true,
        containerClassName: 'my-diffy-container',
        sourceDimensions: { w: 130, h: 100 },
        onFrame: onFrame
    });
}
startDiffy();


/*
 * カメラ１フレーム取得時の処理
 */
var centerOfGravityPrevious = RESOLUTION_X / 2;
var directionPrevious = 0;
var countOfMoving = 0;
var currentImageIndex = 0;
function onFrame(matrix) {
    if (Date.now() < intervalStart + Number(reconizeInterval)) {
        return;
    }

    var sumOfMass = 0;
    var sumOfMoment = 0;
    var index = 0;

    // 検知した動きの質量合計とモーメント合計を求める
    matrix.forEach((row) => {
        row.forEach((element) => {
            var mass = 255 - element;
            sumOfMass += mass;
            sumOfMoment += mass * (index + 1);
            index++;
        })
    });

    if (sumOfMass !== 0) {
        // 重心 = モーメント合計 / 質量合計
        var centerOfGravity = sumOfMoment / sumOfMass;
        var direction = Math.sign(centerOfGravity - centerOfGravityPrevious);
        centerOfGravityPrevious = centerOfGravity;

        if (countOfMoving === 0) {
            countOfMoving++;
            directionPrevious = direction;
        } else if (directionPrevious === direction) {
            countOfMoving++;
        } else {
            directionPrevious = 0;
            countOfMoving = 0;
        }

        if (countOfMoving > Number(reconizeLength)) {
            // 画像切り替え
            if (fileListLength > 0 && fileListLength === loadedCount) {
                if (direction < 0 && pageDirection === "right"
                    || direction > 0 && pageDirection === "left") {
                    if (currentImageIndex > 0) {
                        currentImageIndex--;
                        document.querySelector(`#image${currentImageIndex}`).style.animationName
                            = `slideIn_${getEffectDirection(effect, false)}`;
                        document.querySelector(`#image${currentImageIndex + 1}`).style.animationName
                            = `slideOut_${getEffectDirection(effect, false)}`;
                    }
                } else {
                    if (currentImageIndex < fileListLength - 1) {
                        currentImageIndex++;
                        document.querySelector(`#image${currentImageIndex}`).style.animationName
                            = `slideIn_${getEffectDirection(effect, true)}`;
                        document.querySelector(`#image${currentImageIndex - 1}`).style.animationName
                            = `slideOut_${getEffectDirection(effect, true)}`;
                    }
                }
                document.querySelector("#pageDisp").innerText = `${currentImageIndex + 1}/${fileListLength}`;
            }

            direction = 0;
            countOfMoving = 0;
            intervalStart = Date.now();
        }
    }
}

/*
 * 画像ファイル選択時の処理
 */
var fileListLength = 0;
var loadedCount = 0;
function onFileSelect(event) {
    var fileList = event.target.files;
    var newFileListLength = fileList.length;

    var offsetFileListLength = fileListLength;
    fileListLength += newFileListLength;
    // ソート済みファイル名リストの作成

    var fileNameList = [];
    for (var i = 0; i < fileList.length; i++) {
        var file = fileList[i];
        fileNameList.push(file.name);
    }
    fileNameList.sort();

    for (var i = 0; i < newFileListLength; i++) {
        // img要素の作成
        var imgElem = document.createElement("img");
        imgElem.id = `image${i + offsetFileListLength}`;
        imgElem.style.objectFit = sizeAdjust;
        imgElem.style.animationDuration = (effect === "none"? "1ms" : "500ms");
        imageDiv.appendChild(imgElem)

        // ファイルを取得
        var file = fileList[i];

        var fileReader = new FileReader();
        fileReader.filename = file.name;
        fileReader.onload = function () {
            loadedCount++;

            var index = fileNameList.indexOf(this.filename);
            document.querySelector(`#image${index + offsetFileListLength}`).src = this.result;
            if (index === 0) {
                document.querySelector("#pageDisp").innerText = `${index + 1}/${fileListLength}`;
                document.querySelector(`#image${index}`).style.animationName
                    = `slideIn_${getEffectDirection(effect, false)}`;
            }
        };
        fileReader.readAsDataURL(file);
    }

    imageDiv.style.height = "95vh";
    window.scrollTo(0, 0);
}

/*
 * 画像ファイルクリアの処理
 */
function onFileClear() {
    fileListLength = 0;
    loadedCount = 0;
    currentImageIndex = 0;
    var imageDiv = document.querySelector("#imageDiv");
    while(imageDiv.firstChild) {
        imageDiv.removeChild(imageDiv.firstChild);
    }
    document.querySelector("#pageDisp").innerText = "";
}

/*
 * 設定コントール各種初期化用の関数
 */
function setupControl(itemName, func) {
    document.getElementById(`${itemName}_${window[itemName]}`).checked = true;
    if (func) {
        func(window[itemName]);
    }

    document.querySelectorAll(`input[name='${itemName}']`).forEach(
        e => e.addEventListener("change", function() {
            if (this.checked) {
                window[itemName] = this.value;
                localStorage.setItem(itemName, this.value);

                if (func) {
                    func(this.value);
                }
            }
    }));
}

function setupRange(itemName, func) {
    var elem = document.querySelector(`input[name='${itemName}']`);
    var numElem = document.querySelector(`input[name='${itemName}Num']`);
    elem.value = window[itemName];
    numElem.value = window[itemName];
    if (func) {
        func(window[itemName]);
    }

    elem.addEventListener("change", function() {
        window[itemName] = this.value;
        numElem.value = this.value;
        localStorage.setItem(itemName, this.value);

        if (func) {
            func(this.value);
        }
    });

    numElem.addEventListener("change", function() {
        window[itemName] = this.value;
        elem.value = this.value;
        localStorage.setItem(itemName, this.value);

        if (func) {
            func(this.value);
        }
    });
}

/*
 * 設定反映用の関数
 */
function setSizeAdjust(type) {
    document.querySelectorAll("#imageDiv img").forEach(e => {e.style.objectFit = type});
}

function setEffect(type) {
    document.querySelectorAll("#imageDiv img").forEach(e => {
        if (type === "none") {
            e.style.animationDuration = "1ms";
        } else {
            e.style.animationDuration = "500ms";
        }
    });
}

function getEffectDirection(type, isForward) {
    if (type === "none") {
        return "none";
    } else if (type === "right" && isForward) {
        return "right";
    } else if (type === "right" && !isForward) {
        return "left";
    } else if (type === "left" && isForward) {
        return "left";
    } else if (type === "left" && !isForward) {
        return "right";
    }
}

function setCameraDisplay(doDisp) {
    // visibilityで非表示にすると、Safariで動かなくなるため、透明度で表示・非表示を制御する
    var elem = document.querySelector(".my-diffy-container");
    if (doDisp === "none") {
        elem.style.opacity = "0";
        elem.style.pointerEvents = "none";
    } else {
        elem.style.opacity = "1";
        elem.style.pointerEvents = null;
    }
}

/*
 * ページロード時のコントロール類の初期化
 */
window.addEventListener("load", function() {
    document.querySelector("#fileSelect").addEventListener("change", onFileSelect);
    document.querySelector("#fileClear").addEventListener("click", onFileClear);

    setupControl("pageDirection");
    setupControl("effect", setEffect);
    setupControl("sizeAdjust", setSizeAdjust);
    setupControl("cameraDisplay", setCameraDisplay);
    setupRange("reconizeLength");
    setupRange("reconizeInterval");
});

