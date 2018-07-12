'use strict';

//file.slice 不兼容
//let blobSlice = (File.prototype.mozSlice || File.prototype.webkitSlice || File.prototype.slice)
/**
 * 
 * @param {*} file fileNode.files[0]
 */
async function filemd5(file) {
    var fileReader = new FileReader();// box = document.getElementById('box');
    var chunkSize = 2097152, //2M
        chunks = Math.ceil(file.size / chunkSize),
        currentChunk = 0,
        spark = new SparkMD5();

    do {
        var md5 = await new Promise((resolve) => {
            fileReader.onload = function (e) {
                spark.appendBinary(e.target.result);
                currentChunk++;
                if (currentChunk < chunks) {
                    resolve(false)
                } else {
                    var md5 = spark.end();
                    resolve(md5)
                }
            };
            var start = currentChunk * chunkSize, end = start + chunkSize >= file.size ? file.size : start + chunkSize;
            fileReader.readAsBinaryString(file.slice(start, end));
        })
    } while (!md5)
    return md5;
}

class Upload {
    constructor(file, name) {
        this.handler = {}
        this.data = {}
        this._abort = false
        this.upload(file, name)
    }
    async upload(file, name) {
        var start = 0

        const BYTES_PER_CHUNK = 1024 * 1024; // 1M

        file.md5 = await filemd5(file);
        var start = 0;
        var data;
        do {
            try {
                var data = await this.uploadFileSlice('/upload', file, start, name, BYTES_PER_CHUNK);
                start += BYTES_PER_CHUNK;
                if (this.onprogress) {
                    this.onprogress(data, start)
                }
            } catch (data) {
                console.log(data)
                if (this.onfail) {
                    this.onfail(data)
                }
                break
            }
            if (this._abort) {
                break;
            }
        } while (!this._abort && data['next_start'] > start && data['next_start'] < file.size);
        if (this.onsuccess) {
            this.onsuccess(data)
        }
    }
    abort(abort = true) {
        this._abort = abort;
        return this
    }
    success(func) {
        this.onsuccess = func
        return this
    }
    progress(func) {
        this.onprogress = func
        return this
    }
    fail(func) {
        this.onfail = func
        return this
    }
    /**
     * 
     * @param {*} file 
     * @param {*} start 
     * @param {*} name 
     * @param {*} BYTES_PER_CHUNK 
     */
    uploadFileSlice(url, file, start, name, BYTES_PER_CHUNK = 1024 * 1024) {
        return new Promise((resolve, reject) => {
            var fd = new FormData();
            var res;
            var xhr = new XMLHttpRequest();
            var blobFile = file.slice(start, start + BYTES_PER_CHUNK);
            fd.append("file", blobFile);
            fd.append("start", start);
            fd.append("size", file.size);
            fd.append("md5", file.md5);
            fd.append("name", name || file.name);
            xhr.addEventListener("load", function () {
                try {
                    res = JSON.parse(xhr.responseText);
                } catch (e) {
                    console.log(e)
                    res = (xhr.responseText);
                }
                xhr.status === 200 ? resolve(res) : reject(res)
            }, false);
            xhr.addEventListener("error", function () {
            }, false);
            xhr.open("POST", url);
            xhr.setRequestHeader("Accept", "application/json");
            xhr.send(fd);
        });
    }
}
