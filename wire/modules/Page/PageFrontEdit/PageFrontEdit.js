function PageFrontEditInit($) {
	
	var buttons = $('.pw-edit-buttons'); // wrapper for fixed position edit buttons
	var ckeditors = {}; // instances of ckeditor
	var tinymces = {}; // instances of tinymce
	var isTouch = (('ontouchstart' in window) || (navigator.MaxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0));
	var busy = false;

	/**
	 * Set whether or not system is busy (processing is occurring)
	 * 
	 * @param bool value
	 * 
	 */
	function setBusy(value) {
		busy = value; 
		if(busy) {
			$('body').addClass('pw-busy');
		} else {
			$('body').removeClass('pw-busy');
		}
	}
		

	/**
	 * Load a CSS files
	 * 
	 * @param string file URL to the file 
	 * 
	 */
	function loadCSS(file) {
		$('<link/>', {
			rel: 'stylesheet',
			type: 'text/css',
			href: file
		}).appendTo('head');
	}

	/**
	 * Handler for ckeditor blur and change events
	 * 
	 */
	function ckeBlurEvent(event) {
		var editor = event.editor;
		if(editor.checkDirty()) {
			// value changed
			var el = $(editor.element.$);
			if(el.length) {
				el.closest(".pw-edit").addClass('pw-changed');
				// console.log('cke-changed');
			}
		}
	};
	
	/**
	 * Event when editable area is double clicked or touched
	 * 
	 */
	function inlineEditEvent(e, t, orig, copy) {
	
		if(t.hasClass('pw-editing') || busy) return;
		
		var copyID = copy.attr('id');
		var name = t.attr('data-name');
		
		//if(e.target.nodeName == 'A') return; // don't interfere with links

		t.addClass('pw-editing pw-edited');
		if(!copy.data('prev')) copy.data('prev', copy.html());
		orig.hide();
		copy.show();
		buttons.show();

		// init ckeditor, if used for this field
		if(t.hasClass('pw-edit-InputfieldCKEditor') && typeof CKEDITOR !== 'undefined') {
			if(typeof ckeditors[copyID] == "undefined") {
				var editor = CKEDITOR.inline(copyID, ProcessWire.config['InputfieldCKEditor_' + name]);
				ckeditors[copyID] = editor;
				editor.on('blur', function(e) {
					t.removeClass('pw-editing');	
					ckeBlurEvent(e);
				});
				editor.on('change', ckeBlurEvent);
			}
		} else if(t.hasClass('pw-edit-InputfieldTinyMCE')) {
			if(typeof tinymces[copyID] === 'undefined') {
				InputfieldTinyMCE.init('#' + copyID, 'PageFrontEdit'); 
				var editor = tinymce.get(copyID);
				tinymces[copyID] = editor;
				editor.on('dirty change', function(e) {
					t.addClass('pw-changed'); 
				}); 
			}
		}
		setTimeout(function() {
			copy.trigger('focus');
		}, 250);
	};

	/**
	 * Initialize an editable region
	 * 
	 * @param t The editable region with class "pw-edit"
	 * 
	 */
	function inlineInitEditableRegion(t) {

		var orig = t.children('.pw-edit-orig');
		var copy = t.children('.pw-edit-copy');
		var name = t.attr('data-name');

		copy.hide();
		orig.show();

		if(isTouch) orig.on('pwdoubletap', function(e) {
			inlineEditEvent(e, t, orig, copy);
			return false;
		});
		
		orig.on('dblclick', function(e) {
			inlineEditEvent(e, t, orig, copy);
			return false;
		});

		if(t.is('span')) { // single-line text
			// via @canrau
			copy.on('keydown', function(e) {
				if(e.keyCode == 13){
					e.preventDefault();
					$(this).trigger('blur');
				}
			});
		}

		// check if orig has clickable links within it
		// if so, differentiate between single and double clicks
		// so that we can enable those links to still work while also supporting dblclick
		if(orig.find('a').length) {
			var clicks = 0, timer = null, allowClick = false;
			orig.on('click', 'a', function() {
				var $a = jQuery(this);
				if(allowClick) {
					allowClick = false;
					return true;
				}
				clicks++;
				if(clicks === 1) {
					timer = setTimeout(function() {
						clicks = 0;
						allowClick = true;
						$a[0].click(); // JS, not jQuery click() event
						return true;
					}, 700);
				} else {
					clearTimeout(timer); // prevent single-click action
					allowClick = false;
					clicks = 0;
					orig.trigger('dblclick');
				}
				return false;
			});
			orig.on('dblclick', 'a', function() {
				return false;
			});
		}

		// handler for non-cke/mce blur event
		if(!t.hasClass('pw-edit-InputfieldCKEditor') && !t.hasClass('pw-edit-InputfieldTinyMCE')) {
			copy.on('blur', function() {
				var copy = $(this);
				var t = copy.closest('.pw-editing');
				if(t.length == 0) return;
				if(copy.html() != copy.data('prev')) {
					t.addClass('pw-changed');
					// console.log('changed');
				}
				t.removeClass('pw-editing');
			});
		}
	}


	/**
	 * Cancel all pending changes and restore original values
	 * 
	 */
	function inlineAbandonAllChanges() {
		$('.pw-edited').each(function() {
			var t = $(this);
			var copy = t.children('.pw-edit-copy');
			var orig = t.children('.pw-edit-orig');
			copy.hide().html(copy.data('prev'));
			orig.show();
			copy.data('prev', null);
			t.removeClass('pw-changed pw-edited pw-editing');
		});
		buttons.hide();
	}

	/**
	 * Event for when the "cancel" button is clicked
	 * 
	 */
	function inlineCancelClickEvent() {
		if($('.pw-changed').length > 0) {
			if(confirm(ProcessWire.config.PageFrontEdit.labels.cancelConfirm)) {
				inlineAbandonAllChanges();
				buttons.hide();
			} else {
				// leave as-is
			}
		} else {
			inlineAbandonAllChanges();
		}
		return false;
	}

	/**
	 * Event for when the "save" button is clicked
	 * 
	 */
	function inlineSaveClickEvent() {
		
		if(busy) return;
		setBusy(true);
		
		var pageID = parseInt($('#Inputfield_id').val());
		var langID = parseInt($('#pw-edit-lang').val());
		var btnSave = $('.pw-edit-save');
		var btnCancel = $('.pw-edit-cancel');
		var btnSaving = $('.pw-edit-saving');
		var btnSaved = $('.pw-edit-saved');
		var edited = $('.pw-changed');

		var postData = {
			action: 'PageFrontEditSave',
			id: pageID,
			language: langID,
			fields: {}
		};

		var postToken = $('input._post_token');
		var csrfName = postToken.attr('name');
		var csrfValue = postToken.val();
		postData[csrfName] = csrfValue;

		edited.each(function() {
			var t = $(this);
			var name = t.attr('data-name');
			var page = parseInt(t.attr('data-page'));
			var orig = t.children('.pw-edit-orig');
			var copy = t.children('.pw-edit-copy');
			var key = page + '__' + name;
			if(t.hasClass('pw-edit-InputfieldCKEditor')) {
				var editor = ckeditors[copy.attr('id')];
				editor.getSelection().reset();
				editor.getSelection().removeAllRanges();
				/*
				if(editor.focusManager.hasFocus) {
					// CKEditor has documented bug that causes JS error on editor.getData(), so this prevents it
					editor.focusManager.focus(true);
					editor.focus();
				}
				*/
				postData.fields[key] = editor.getData();
			} else if(t.hasClass('pw-edit-InputfieldTinyMCE')) {
				var editor = tinymces[copy.attr('id')];
				postData.fields[key] = editor.getContent();
			} else {
				var textarea = document.createElement('textarea');
				textarea.innerHTML = copy[0].innerHTML;
				postData.fields[key] = textarea.value;
			}
		});

		btnSave.hide();
		btnCancel.hide();
		btnSaving.show();
		
		for(var copyID in tinymces) {
			InputfieldTinyMCE.destroyEditors($('#' + copyID));
		}
		$('.InputfieldTinyMCELoaded').removeClass('InputfieldTinyMCELoaded');
		$('.pw-edit-InputfieldTinyMCE').removeClass('pw-editing pw-edited');
		tinymces = {}
		
		// post save data to server
		$.post(ProcessWire.config.PageFrontEdit.pageURL, postData, function(data) {
			btnSaving.hide();

			if(data.status > 0) {
				// success

				edited.each(function() {
					var t = $(this);
					var name = t.attr('data-name');
					var page = t.attr('data-page');
					var orig = t.children('.pw-edit-orig');
					var copy = t.children('.pw-edit-copy');
					var key = page + '__' + name;
					t.removeClass('pw-editing pw-edited pw-changed');
					orig.html(data.formatted[key]);
					copy.html(data.unformatted[key]);
					copy.data('prev', null);
					copy.hide().trigger('pw-reloaded');
					orig.show().trigger('pw-reloaded');
				});

				btnSaved.show();

				setTimeout(function() {
					buttons.fadeOut('fast', function() {
						btnSaved.hide();
						btnSave.show();
						btnCancel.show();
						setBusy(false);
					});
				}, 1000);

			} else {
				// error	
				setBusy(false);
				alert(data.error);
				btnSave.show();
				btnCancel.show();
				buttons.hide();
				$('.pw-editing, .pw-edited').each(function() {
					var t = $(this);
					t.removeClass('pw-editing pw-edited pw-changed');
					var orig = t.children('.pw-edit-orig');
					var copy = t.children('.pw-edit-copy');
					copy.hide();
					orig.show();
				});
			}
			
			for(var copyID in ckeditors) {
				var instance = ckeditors[copyID];
				instance.destroy();
			}
			ckeditors = {};
			$('.pw-edit-InputfieldTinyMCE').each(function() {
				inlineInitEditableRegion($(this));
			});
			
		});
	}
	
	/**
	 * Initialize all modal edit regions
	 *
	 * @param t
	 *
	 */
	function modalInitEditableRegions() {

		var regions = $('.pw-edit-modal');
		if(!regions.length) return;

		$(document).on('pw-modal-closed', function(e, eventData) {
			if(eventData.abort) return; // modal.js populates 'abort' if "x" button was clicked
			var target = $(e.target);
			if(!target.hasClass('pw-edit-modal')) return;
			var targetID = target.attr('id');
			var viewURL = $('#pw-url').val();
			viewURL += (viewURL.indexOf('?') > -1 ? '&' : '?') + 'pw_edit_fields=' + target.attr('data-fields');
			setBusy(true);
			
			target.load(viewURL + ' #' + targetID, {}, function() {
				var t = $(this);
				var children = t.children();
				if(children.length) {
					var html = t.children().html();
					t.html(html);
				}
				t.trigger('pw-reloaded');
				setBusy(false);
			});
		});
	}
	
	/**
	 * Paste event 
	 * 
	 * @param e
	 */
	function pasteEvent(e) {
		
		// only intercept pasting to frontend editable text fields
		if(!document.activeElement.isContentEditable) return;
		
		var wrap = $(document.activeElement).closest('.pw-edit');
		if(!wrap.length) return;
		
		var usePlainText = false;
		var plainTextTypes = [ 'Text', 'Textarea', 'PageTitle', 'Email', 'Float', 'Integer', 'URL' ];
		
		for(var n = 0; n < plainTextTypes.length; n++) {
			usePlainText = wrap.hasClass('pw-edit-Inputfield' + plainTextTypes[n]);
			if(usePlainText) break;
		}
	
		if(usePlainText) {
			// Prevent the default paste action
			e.preventDefault();
			
			// Get the clipboard data as plain text
			var clipboardData = (e.originalEvent || e).clipboardData;
			var pastedText = clipboardData.getData('text/plain');
			
			// Convert any markup in the pasted text to entity-encoded plain text
			var plainText = $('<textarea />').text(pastedText).html();
			
			// Insert the plain text into the contenteditable element or textarea
			document.execCommand('insertHTML', false, plainText);
		}
	}
	
	/**
	 * Initialize PageFrontEdit
	 * 
	 */
	function init() {
		
		if(isTouch) buttons.addClass('pw-edit-buttons-touch');

		// test if font-awesome needs to be loaded
		var test = $('#pw-fa-test');
		var width = test.width();
		if(width < 10) loadCSS(ProcessWire.config.PageFrontEdit.files.fa);
		test.hide();

		// load PageFrontEdit.css
		loadCSS(ProcessWire.config.PageFrontEdit.files.css);
		
		$('body').addClass('pw-' + ProcessWire.config.PageFrontEdit.adminTheme);

		// setup editable regions
		$('.pw-edit:not(.pw-edit-modal)').each(function() {
			inlineInitEditableRegion($(this));
		});

		// initialize modal edit regions
		modalInitEditableRegions();
		
		if($('.pw-edit-InputfieldTinyMCE').length) {
			var file1 = ProcessWire.config.PageFrontEdit.files.tinymce1;
			var file2 = ProcessWire.config.PageFrontEdit.files.tinymce2;
			jQuery.getScript(file1, function() {
				tinymce.baseURL = TINYMCE_BASEURL;
				tinymce.suffix = '.min';
				jQuery.getScript(file2, function() {
				}).fail(function(jqxhr, settings, exception) {
					alert('failed to load ' + file2 + ': ' + exception);
				});
			}).fail(function(jqxhr, settings, exception) {
				alert('failed to load ' + file1 + ': ' + exception);
			});
		}
		
		// load ckeditor, modal and plugins, if needed
		if($('.pw-edit-InputfieldCKEditor').length) {
			jQuery.getScript(ProcessWire.config.PageFrontEdit.files.ckeditor, function() {
				jQuery.getScript(ProcessWire.config.PageFrontEdit.files.modal, function() {
					for(var name in ProcessWire.config.InputfieldCKEditor.plugins) {
						var file = ProcessWire.config.InputfieldCKEditor.plugins[name];
						CKEDITOR.plugins.addExternal(name, file, '');
					}
				}).fail(function(jqxhr, settings, exception) {
					alert('failed to load modal.js: ' + exception);
				});
			}).fail(function(jqxhr, settings, exception) {
				alert('failed to load ckeditor.js: ' + exception);
			});
		} else {
			jQuery.getScript(ProcessWire.config.PageFrontEdit.files.modal)
				.fail(function(jqxhr, settings, exception) {
					alert('failed to load modal.js: ' + exception);
				});
		}

		// click action to cancel edits
		$('.pw-edit-cancel').on('click', inlineCancelClickEvent);

		// click action to save edits
		$('.pw-edit-save').on('click', function() {
			$('.pw-editing:not(.pw-edit-InputfieldCKEditor)').trigger('blur');
			setTimeout(function() {
				inlineSaveClickEvent();
			}, 250); 
		});
		
		document.addEventListener('paste', pasteEvent);
	}
	
	init();
}

jQuery(document).ready(function($) {
	PageFrontEditInit($);
});
