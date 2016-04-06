(function($, JSONEditor) {
    'use strict';

    /**
     * Initialize the arguments editor.
     * @param  {jQuery object} $actionSelect
     * @param  {jQuery object} $argumentsJson
     */
    function initialize($actionSelect, $argumentsJson) {
        var $editorElement = $('<div class="arguments-editor"></div>');
        var editor = null;

        // Insert editor next to field.
        $editorElement.insertBefore($argumentsJson);

        // Update the backing textarea before submitting.
        $actionSelect.parents('form').submit(function() {
            if (editor !== null) {
                $argumentsJson.val(JSON.stringify(editor.getValue()));
            }
        });

        // When the action type changes, remove the existing editor and
        // create a new one.
        $actionSelect.change(function() {
            if (editor !== null) {
                editor.destroy();
                editor = null;
            }

            if ($actionSelect.val() === '') {
                return;
            }

            var actionName = $actionSelect.find('option:selected').text();
            $.getJSON('/api/v1/action/' + actionName + '/', function(action) {
                editor = new JSONEditor($editorElement[0], {
                    schema: action.arguments_schema,
                    iconlib: 'fontawesome4',
                    disable_properties: true,
                    disable_collapse: true,
                    theme: 'django'
                });

                // Assign data regardless of validation to avoid data
                // loss.
                var data = JSON.parse($argumentsJson.val());
                editor.setValue(data);
            });
        });
    }

    // Tweaks to the normal theme that aren't possible via CSS.
    JSONEditor.defaults.themes.django = JSONEditor.defaults.themes.html.extend({
        getIndentedPanel: function() {
            var el = this._super();
            el.style.border = 'none';
            el.style.overflow = 'hidden';
            return el;
        },

        getTab: function(span) {
            var el = this._super(span);
            $(el).prepend('<i class="fa fa-file-text-o"></i>');
            return el;
        },

        getFormInputDescription: function(text) {
            var el = this._super(text);
            el.style.marginLeft = '5px';
            return el;
        },

        getModal: function(text) {
            var el = this._super(text);
            el.classList.add('modal');
            return el;
        },
    });

    // Initialize the editor.
    $(function() {
        initialize($('#id_action'), $('#id_arguments_json'));
    });
})(django.jQuery, window.JSONEditor);
