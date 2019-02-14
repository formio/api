module.exports = class Action {
  constructor(app, settings) {
    this.app = app;
    this.settings = settings;
  }

  static settingsForm(options, actionSettings) {
    return [
      {
        type: 'hidden',
        input: true,
        key: 'priority'
      },
      {
        type: 'hidden',
        input: true,
        key: 'name'
      },
      {
        type: 'textfield',
        input: true,
        label: 'Title',
        key: 'title'
      },
      {
        type: 'fieldset',
        key: 'actionSettings',
        input: false,
        tree: true,
        legend: 'Action Settings',
        components: [
          {
            input: false,
            type: 'container',
            key: 'settings',
            components: actionSettings
          }
        ]
      },
      {
        type: "fieldset",
        input: false,
        tree: false,
        key: "conditions",
        legend: "Action Execution",
        components: [
          {
            type: (options.info.access && options.info.access.handler === false) ? 'hidden' : 'select',
            input: true,
            key: 'handler',
            label: 'Handler',
            placeholder: 'Select which handler(s) you would like to trigger',
            dataSrc: 'json',
            data: {json: JSON.stringify([
                {
                  name: 'before',
                  title: 'Before'
                },
                {
                  name: 'after',
                  title: 'After'
                }
              ])},
            template: '<span>{{ item.title }}</span>',
            valueProperty: 'name',
            multiple: true
          },
          {
            type: (options.info.access && options.info.access.method === false) ? 'hidden' : 'select',
            input: true,
            label: 'Methods',
            key: 'method',
            placeholder: 'Trigger action on method(s)',
            dataSrc: 'json',
            data: {json: JSON.stringify([
                {
                  name: 'create',
                  title: 'Create'
                },
                {
                  name: 'update',
                  title: 'Update'
                },
                {
                  name: 'read',
                  title: 'Read'
                },
                {
                  name: 'delete',
                  title: 'Delete'
                },
                {
                  name: 'index',
                  title: 'Index'
                }
              ])},
            template: '<span>{{ item.title }}</span>',
            valueProperty: 'name',
            multiple: true
          }
        ]
      },
      {
        key: 'fieldset',
        type: 'fieldset',
        input: false,
        tree: false,
        legend: 'Action Conditions (optional)',
        components: [
          {
            type: 'container',
            key: 'condition',
            input: false,
            tree: true,
            components: [
              {
                key: 'columns',
                type: 'columns',
                input: false,
                columns: [
                  {
                    components: [
                      {
                        type: 'select',
                        input: true,
                        label: 'Trigger this action only if field',
                        key: 'field',
                        placeholder: 'Select the conditional field',
                        template: '<span>{{ item.label || item.key }} ({{item.key}})</span>',
                        dataSrc: 'json',
                        data: {json: JSON.stringify(options.components)},
                        valueProperty: 'key',
                        multiple: false
                      },
                      {
                        type : 'select',
                        input : true,
                        label : '',
                        key : 'eq',
                        placeholder : 'Select comparison',
                        template : '<span>{{ item.label }}</span>',
                        dataSrc : 'values',
                        data : {
                          values : [
                            {
                              value : '',
                              label : ''
                            },
                            {
                              value : 'equals',
                              label : 'Equals'
                            },
                            {
                              value : 'notEqual',
                              label : 'Does Not Equal'
                            }
                          ],
                          json : '',
                          url : '',
                          resource : ''
                        },
                        valueProperty : 'value',
                        multiple : false
                      },
                      {
                        input: true,
                        type: 'textfield',
                        inputType: 'text',
                        label: '',
                        key: 'value',
                        placeholder: 'Enter value',
                        multiple: false
                      }
                    ]
                  },
                  {
                    components: [
                      {
                        key: 'well2',
                        type: 'well',
                        input: false,
                        components: [
                          {
                            key: 'html',
                            type: 'htmlelement',
                            tag: 'h4',
                            input: false,
                            content: 'Or you can provide your own custom JavaScript or <a href="http://jsonlogic.com" target="_blank">JSON</a> condition logic here',
                            className: ''
                          },
                          {
                            label: '',
                            type: 'textarea',
                            editor: 'ace',
                            input: true,
                            key: 'custom',
                            editorComponents: options.components,
                            placeholder: `// Example: Only execute if submitted roles has 'authenticated'.
JavaScript: execute = (data.roles.indexOf('authenticated') !== -1);
JSON: { "in": [ "authenticated", { "var": "data.roles" } ] }`
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        key: 'html2',
        type: 'htmlelement',
        tag: 'hr',
        input: false,
        content: '',
        className: ''
      },
      {
        type: 'button',
        input: true,
        label: 'Save Action',
        key: 'submit',
        size: 'md',
        leftIcon: '',
        rightIcon: '',
        block: false,
        action: 'submit',
        disableOnInvalid: true,
        theme: 'primary'
      }
    ];
  }
};
