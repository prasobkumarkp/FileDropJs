(function ($) {
	$.fn.fileDrop = function (options) {

		var settings = {};
		$.extend(true, settings, $.fn.fileDrop.defaults, options); //deep copy

		return this.each(function () {
			var self = $(this);
			self.fileDrop = {
				filesToUpload: [],
				isUploadInProgress: false,
				log: function (message) {
					if (settings.showConsoleLog)
						console.log("fileDrop : " + message);
				}
			};
			self.fileDrop.browser = {};

			self.fileDrop.browser.isIE9orBelow = /MSIE\s/.test(navigator.userAgent) && parseFloat(navigator.appVersion.split("MSIE")[1]) < 10;
			self.fileDrop.ie9andBelowFrom = $("<form></from>");
			self.fileDrop.target = self;
			self.fileDrop.target.addClass("fileDropjs");
			self.fileDrop.dropContainer = $("<div class='filedropContainer'>Drop file here or click to browse</di>");
			self.fileDrop.inputHandle = $("<input type='file' name='files' class='inputFileHandle' style='display:none' " + (settings.allowMultipleSelection ? "multiple" : "") + ">");
			self.fileDrop.uploadContainer = $("<div class='uploadContainer'></di>");
			self.fileDrop.previewFileTarget = $("<div class='previewFileTarget'></div>");


			if (settings.useDefaultContainers) {
				self.fileDrop.target.append(self.fileDrop.dropContainer);
				self.fileDrop.target.append(self.fileDrop.uploadContainer);
				self.fileDrop.target.after(self.fileDrop.previewFileTarget);
			}

			if (self.fileDrop.browser.isIE9orBelow) {
				self.fileDrop.ie9andBelowFrom.append(self.fileDrop.inputHandle);
				self.fileDrop.target.append(self.fileDrop.ie9andBelowFrom);
				//$(self.fileDrop.inputHandle).show();
			} else {
				self.fileDrop.target.append(self.fileDrop.inputHandle);
			}

			self.fileDrop.inputHandle.on("change",
				function (e) {
					e.stopPropagation();
					if (self.fileDrop.browser.isIE9orBelow) {

						if ("ActiveXObject" in window) {
							//alert("ActiveX is enabled");
						}
						else { alert("Enalbe ActiveX to use this feature or use latest version of browser") }

						var iefilePath = $(self.fileDrop.inputHandle).val();
						var ieFileName = iefilePath.slice(iefilePath.lastIndexOf("\\") + 1);
						var objFSO = new ActiveXObject("Scripting.FileSystemObject");
						var objFile = objFSO.getFile(iefilePath);
						var fileSize = objFile.size; //size in kb
						var ieFiles = [];
						ieFiles.push({ name: ieFileName, size: fileSize });
						self.fileDrop.addFilesToQueue(ieFiles);

						//------------------------------------------------------------------------

						//iePost(self.fileDrop.ie9andBelowFrom[0], settings.url, iePostCallBack);


					} else {
						self.fileDrop.addFilesToQueue(self.fileDrop.inputHandle[0].files);
						self.fileDrop.inputHandle.val(null);
					}
				});

			function fileSizevalidation(file) {
				var response = {
					status: false,
					message: settings.message.fileSizeExceeded
				};
				if (file.size > 0) {
					var fileSizeInMb = file.size / (1024 * 1024);
					if (fileSizeInMb < parseInt(settings.fileSizePerFileInMb)) {
						response.status = true;
						return response;
					}
				} else {
					response.message = settings.message.fileSizeIsZero;
				}
				return response;
			}

			function fileTypeValidation(file) {
				var response = {
					status: false,
					message: settings.message.fileTypeNotSupported
				};

				var fileParts = file.name.split(".");
				if (fileParts.length > 1) {

					$(settings.supportedFileTypes).each(function (i, j) {
						var c = fileParts[fileParts.length - 1];
						if (c.toLowerCase() === j.toLowerCase()) {
							response.status = true;
							return response;
						}
					});
				}
				return response;
			}

			function iePost(form, action_url, callBack) {
				var ieFilePath = $(form).find(".inputFileHandle").val();
				var ieFileParts = ieFilePath.split("\\");
				var ieFileName = ieFileParts[ieFileParts.length - 1];
				var fileSize = 0;

				try {
					var activeXObject = new ActiveXObject("Scripting.FileSystemObject");
					var objFile = activeXObject.getFile(ieFilePath);
					fileSize = objFile.size; //size in kb
				} catch (e) {
					alert("Active X Object is disabled. Enable actiev X and refresh the page. Or upgrade to latest version of browser");
				}


				var files = [];
				//fake file class
				var file = { name: ieFileName, size: fileSize, fileRetryAttemptOnError: settings.fileRetryAttemptOnError };
				files.push(file);
				self.fileDrop.addFilesToQueue(files);

				//check the file name and size exists in queue.
				if (self.fileDrop.filesToUpload > 0) {

					// Create the iframe
					var iframe = document.createElement("iframe");
					iframe.setAttribute("id", "upload_iframe");
					iframe.setAttribute("name", "upload_iframe");
					iframe.setAttribute("width", "0");
					iframe.setAttribute("height", "0");
					iframe.setAttribute("border", "0");
					iframe.setAttribute("style", "width: 0; height: 0; border: none;");

					// Add to document
					form.parentNode.appendChild(iframe);
					window.frames["upload_iframe"].name = "upload_iframe";

					var iframeId = document.getElementById("upload_iframe");

					// Add event
					var eventHandler = function (e) {
						var response = "";
						if (iframeId.detachEvent) iframeId.detachEvent("onload", eventHandler);
						else iframeId.removeEventListener("load", eventHandler, false);

						if (iframeId.contentDocument) {
							response = iframeId.contentDocument.body.innerText;
						} else if (iframeId.contentWindow) {
							response = iframeId.contentWindow.document.body.innerText;
						} else if (iframeId.document) {
							response = iframeId.document.body.innerText;
						}
						setTimeout(function () { iframeId.parentNode.removeChild(iframeId); }, 250);
						callBack(response);
					}

					if (iframeId.addEventListener) iframeId.addEventListener("load", eventHandler, true);
					if (iframeId.attachEvent) iframeId.attachEvent("onload", eventHandler);

					// Set properties of form
					form.setAttribute("target", "upload_iframe");
					form.setAttribute("action", action_url);
					form.setAttribute("method", "post");
					form.setAttribute("enctype", "multipart/form-data");
					form.setAttribute("encoding", "multipart/form-data");

					var attributeInputs = $(self).ieData();
					if (attributeInputs != null) {
						var keys = Object.keys(attributeInputs);
						$(keys).each(function (i, j) {
							var input = document.createElement("input");
							input.setAttribute("name", j);
							input.setAttribute("value", attributeInputs[j]);
							input.setAttribute("type", "hidden");
							form.appendChild(input);
						});
						var input = document.createElement("input");
						input.setAttribute("name", "jsonReposne");
						input.setAttribute("value", "false");
						input.setAttribute("type", "hidden");
						form.appendChild(input);
					}

					// Submit the form...
					var c = form.submit(function (d) {
						settings.showConsoleLog && self.fileDrop.log(d);
					});
				}
			}

			function iePostCallBack(response) {
				if (response != null) {
					response = JSON.parse(response);
					settings.onFileUploaded !== void (0) && settings.onFileUploaded(true, response);
				}
			}

			self.fileDrop.validateFile = function (file) {
				var status = fileSizevalidation(file);
				if (!status.status) {
					return status;
				}
				status = fileTypeValidation(file);
				if (!status.status) {
					return status;
				}
				return status;
			}

			self.fileDrop.addFilesToQueue = function (files) {
				$(files).each(function (i, j) {
					var ui = $(settings.uploadItemTemplate);
					var uiName = ui.find("." + settings.uploadItemNameClass);
					uiName.append("<p>" + j.name + "</div>").append("<p>Queued</p>");

					var uiElement = {};
					uiElement.progress = $(ui).find("." + settings.progressClass);
					uiElement.fileName = $(uiName).find("p:first-child");
					uiElement.status = $(uiName).find("p:last-child");
					var fileType = j.name.slice(j.name.lastIndexOf(".") + 1);

					if (fileType !== void (0) && fileType !== null && settings.thumbnailSettings.targetClass !== void (0)) {
						uiElement.thumbnail = $(ui).find("." + settings.thumbnailSettings.targetClass);
						if (uiElement.thumbnail.find("img").length === 1) {
							uiElement.thumbnail.find("img").attr("src", URL.createObjectURL(j)).height(settings.thumbnailSettings.imageHeieght).width(settings.thumbnailSettings.imageWidth);
						}
						uiElement.thumbnail.addClass(fileType.toLowerCase());
					}

					$(ui.find("." + settings.uploadItemRevmoveClass)).on("click",
						function (e) {
							$(this).closest("." + settings.uploadItemClass).hide();
							self.fileDrop.removeQueuedFile({
								file: j,
								uiElement: uiElement
							});
							e.stopPropagation();
						});

					if (self.fileDrop.validateFile(j).status) {
						if (settings.allowFileQueue && self.fileDrop.filesToUpload.length < settings.maxQueueSize) {
							self.fileDrop.filesToUpload.push({
								file: j,
								uiElement: uiElement,
								fileRetryAttemptOnError: settings.fileRetryAttemptOnError
							});

							settings.showConsoleLog && self.fileDrop.log("added file to queue : " + j.name + ", queue size : " + self.fileDrop.filesToUpload.length);

							// add file to UI
							self.fileDrop.target.next(settings.previewFileTarget).append(ui);
							// add file to queue
							settings.onFileAddedToQueue !== void (0) && settings.onFileAddedToQueue(j);

						} else {
							settings.showConsoleLog && self.fileDrop.log("fileQueue is disabled or max queue size is reached");
							//self.fileDrop.log("fileQueue is disabled or max queue size is reached, the last item being replaced");

							// remove the last file
							//if (self.fileDrop.filesToUpload.length > 0) {
							//	var removedItem = self.fileDrop.filesToUpload.pop();// remove;
							//	var removedFileName = removedItem !== void (0) ? removedItem.file.name : "";
							//	self.fileDrop.log("removed : " + removedFileName + ", and added : " + j.name + ", queue length : " + self.fileDrop.filesToUpload.length);
							//}

							//add the new file
							//self.fileDrop.filesToUpload.push({
							//	file: j,
							//	uiElement: uiElement,
							//	fileRetryAttemptOnError: settings.fileRetryAttemptOnError
							//});
							//settings.onFileAddedToQueue(j);
						}
					} else {
						uiElement.status.text(self.fileDrop.validateFile(j).message);
						uiElement.progress.addClass(settings.progressErrorClass).css("width", "100%"); //should be changed
					}
				});

				settings.showConsoleLog && self.fileDrop.log("current queue size : " + self.fileDrop.filesToUpload.length);
				if (settings.autoSumbitFile)
					self.fileDrop.upload();
			}

			self.fileDrop.removeQueuedFile = function (file) {
				if (self.fileDrop.filesToUpload.length > 0) {
					$(self.fileDrop.filesToUpload).each(function (i, j) {
						if (j.uiElement === file.uiElement) {
							self.fileDrop.filesToUpload.splice(i, 1);
							settings.showConsoleLog && self.fileDrop.log("remove from queue : " + j.file.name + "queue size : " + self.fileDrop.filesToUpload.length);
							settings.onFileRemovedFromQueue !== void (0) && settings.onFileRemovedFromQueue(j.file, self.fileDrop.filesToUpload.length);
						}
					});
				}
			}

			self.fileDrop.processResponse = function (filesToUpload, response) {
				if ($.isArray(response)) {
					$(response).each(function (i, j) {
						$(filesToUpload).each(function (k, l) {
							if (j.name === l.file.name) {
								if (j.status === false) {
									l.uiElement.status.text((j.message !== void (0)) ? j.message : settings.message.error);
									//l.uiElement.progress.addClass(settings.progressErrorClass).css("width", "100%"); //should be changed
									settings.onProgressChange(-1, i, j);
									if (l.fileRetryAttemptOnError === 0) {
										self.fileDrop.removeQueuedFile(l);
									} else {
										l.fileRetryAttemptOnError -= 1;
									}
								} else if (j.status === true) {
									l.uiElement.status.text(settings.message.Uploaded);
									//l.uiElement.progress.addClass(settings.progressSuccessClass).css("width", "100%"); //should be changed
									settings.onProgressChange(100, i, j);
									self.fileDrop.removeQueuedFile(l);
								}
							}
						});
					});
				} else {
					$(filesToUpload).each(function (i, j) {
						//j.uiElement.progress.css("width", "100%").addClass(settings.progressSuccessClass);

						settings.onProgressChange(100, i, j);
						j.uiElement.status.text(settings.message.Uploaded);
						self.fileDrop.removeQueuedFile(j);
					});
				}
			}


			// initialize submit button
			if (!settings.autoSumbitFile) {
				//$(settings.submitButton).unbind("click");
				$(settings.submitButton).on("click",
					function (e) {
						if (!self.fileDrop.isUploadInProgress) {
							e.stopPropagation();
							//if (self.fileDrop.browser.isIE9orBelow) {
							//	$(self.fileDrop.ie9andBelowFrom).submit();
							//} else {
							self.fileDrop.upload();
							//}
						}
					});
			}

			self.fileDrop.upload = function () {
				self.fileDrop.uploadInProgress = true;
				uploadFile(self.fileDrop.filesToUpload);
			}


			var ieFormData = function ieFormData() {
				//if (window.FormData == undefined) {
				this.processData = true;
				this.contentType = 'application/x-www-form-urlencoded';
				this.append = function (name, value) {
					this[name] = value == undefined ? "" : value;
					return true;
				}
				//}
				//else {
				//    var formdata = new FormData();
				//    formdata.processData = false;
				//    formdata.contentType = false;
				//    return formdata;
				//}
			}


			// uploadFile function
			function uploadFile(filesToUpload) {
				var files = (window.FormData == undefined) ? files = new ieFormData() : new FormData();


				$(filesToUpload).each(function (i, j) {
					j.uiElement.status.text(settings.message.Uploading);
					//j.uiElement.progress.css("width", "4%"); // error to higlight
					settings.onProgressChange(4, i, j);
					files.append("files", j.file);
				});

				if (settings.allowDataAttributeInput) {
					var attributeInputs = self.data();
					var keys = Object.keys(attributeInputs);
					$(keys).each(function (i, j) {
						files.append(j, attributeInputs[j]);
					});
				}

				//displayProgress();
				//onProgressChnage(0);
				var xhr = $.ajax({
					xhr: function () {
						var xhrobj = $.ajaxSettings.xhr();
						if (xhrobj.upload) {
							xhrobj.upload.addEventListener("progress",
								function (event) {
									var percent = 0;
									var position = event.loaded || event.position;
									var total = event.total;
									if (event.lengthComputable) {
										percent = Math.ceil(position / total * 96);
									}

									$(filesToUpload).each(function (i, j) {
										if (settings.showConsoleLog)
											settings.showConsoleLog && self.fileDrop.log("filename : " + j.file.name + ", progress : " + percent);
										settings.onProgressChange(percent, i, j);
									});
								},
								false);
						}
						return xhrobj;
					},
					url: settings.url,
					type: "POST",
					contentType: false,
					processData: false,
					cache: false,
					data: files,
					success: function (result) {
						self.fileDrop.processResponse(self.fileDrop.filesToUpload, result);
						settings.onFileUploaded !== void (0) && settings.onFileUploaded(true, result);
						self.fileDrop.isUploadInProgress = false;
					},
					error: function (xhr, status, error) {
						//uiElement.progress.addClass(settings.progressErrorClass).removeClass(settings.progressClass);

						$(self.fileDrop.filesToUpload).each(function (i, j) {
							j.uiElement.progress.addClass(settings.progressErrorClass);
							j.uiElement.status.text(settings.message.error);
						});
						settings.onFileUploaded !== void (0) && settings.onFileUploaded(false, error);
						self.fileDrop.uploadInProgress = false;
					}
				});
			};

			$(self.fileDrop.target).on("click",
				function (e) {
					//self.fileDrop.target.find(".inputFileHandle")[0].dispatchEvent(new MouseEvent("click", { bubbles: false }));
					e.stopImmediatePropagation();
					$(self.fileDrop.inputHandle).trigger("click");

				});
			$(self.fileDrop.inputHandle).on("click",
				function (e) {
					e.stopPropagation();
				});
			self.fileDrop.target.on("dragover",
				function (e) {
					e.stopPropagation();
					e.preventDefault();
					self.fileDrop.target.addClass(settings.hoverClass);
					settings.showConsoleLog && self.fileDrop.log("dragover");
				});
			self.fileDrop.target.on("drop",
				function (e) {
					e.preventDefault();
					self.fileDrop.addFilesToQueue(e.originalEvent.dataTransfer.files);
					self.fileDrop.target.removeClass(settings.hoverClass);
					settings.showConsoleLog && self.fileDrop.log("dropped");
				});
			self.fileDrop.target.on("dragleave",
				function (e) {
					e.preventDefault();
					self.fileDrop.target.removeClass(settings.hoverClass);
					settings.showConsoleLog && self.fileDrop.log("dragleave");
				});
		});
	}

	//consumer can override plugin defaults - no need to apss each time in function call.
	$.fn.fileDrop.defaults = {
		url: "file/post",
		target: ".filedropjs",
		fileSizePerFileInMb: 1,
		maxQueueSize: 10,
		allowFileQueue: true,// conflicts if set to false.
		allowMultipleSelection: false,
		allowDataAttributeInput: false,
		supportedFileTypes: ["jpg", "jpeg", "png", "pdf"],
		parallelUpload: true,
		classicBrowserSupport: true,
		useDefaultContainers: true,
		autoSumbitFile: false,
		submitButton: ".btnPrimary", //class or id
		hoverClass: "",
		previewFileTarget: ".previewFileTarget",
		uploadItemTemplate: "<div class='fdFile'> <div class='fdUploadProgress'></div> <div class='fdFileThumbnail'><img src=''></div> <div class='fdFileDetails'><div class='fdFileName'></div><div class='fdFileStatus'></div> </div> <div class='fdCloseFile'>x</div></div>",
		uploadItemClass: "fdFile",
		progressClass: "fdUploadProgress",
		progressSuccessClass: "success",
		progressErrorClass: "error",
		uploadItemNameClass: "fdFileName",
		uploadItemRevmoveClass: "fdCloseFile",
		thumbnailSettings: {
			targetClass: "fdFileThumbnail",
			imageWidth: 75,
			imageHeieght: 75
		},
		fileRetryAttemptOnError: 3,
		onFileAddedToQueue: function (file) {

		},
		OnFileRemovedFromQueue: function (file, currentQueueLength) {

		},
		OnFileValidation: void (0),
		onFileUploaded: function (status, response) {},
		onProgressChange: function (percent, i, j) {
			if (percent === 100)
				j.uiElement.progress.addClass(settings.progressSuccessClass);
			else if (percent === -1)
				j.uiElement.progress.addClass(settings.progressErrorClass);
			j.uiElement.progress.css("width", percent + "%");
		},
		showConsoleLog: false,
		message: {
			fileSizeExceeded: "Max file size is exceeded",
			fileSizeIsZero: "File size cannot be zero",
			fileTypeNotSupported: "File type is not supported",
			error: "Error, please try again",
			Uploading: "Uploading..",
			Uploaded: "Uploaded"
		}
	};
})(jQuery);


$.fn.ieData = function () { var t = {}; return [].forEach.call(this.get(0).attributes, function (a) { if (/^data-/.test(a.name)) { var e = a.name.substr(5).replace(/-(.)/g, function (t, a) { return a.toUpperCase() }); t[e] = a.value } }), t };