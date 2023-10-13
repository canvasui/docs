let componentJson = {
    "main": {
        "style": [
            {
                "selector": "template",
                "declaration": {
                    "flex-direction": "column",
                    "align-items": "center"
                }
            },
            {
                "selector": ".hello",
                "declaration": {
                    "color": "gray",
                    "font-size": "50px"
                }
            },
            {
                "selector": "image",
                "declaration": {
                    "width": "200px",
                    "height": "200px"
                }
            },
            {
                "selector": "div",
                "declaration": {
                    "justify-content": "space-around",
                    "align-items": "center",
                    "margin": "10px",
                    "width": "700px",
                    "height": "100px",
                    "border": "1px dotted gray",
                    "border-radius": "10px",
                    "padding": "5px"
                }
            }
        ],
        "template": {
            "type": "component",
            "tagName": "template",
            "props": {},
            "children": [
                {
                    "type": "component",
                    "tagName": "text",
                    "props": {
                        "class": "hello",
                        "content": "hello { name } !"
                    },
                    "children": [],
                    "parent": {
                        "type": "component",
                        "tagName": "template",
                        "props": {},
                        "parent": {
                            "type": "component"
                        },
                        "style": {}
                    },
                    "style": {}
                },
                {
                    "type": "component",
                    "tagName": "image",
                    "props": {
                        "id": "image-demo",
                        "path": "{ imagePath }"
                    },
                    "children": [],
                    "parent": {
                        "type": "component",
                        "tagName": "template",
                        "props": {},
                        "parent": {
                            "type": "component"
                        },
                        "style": {}
                    },
                    "style": {}
                },
                {
                    "type": "component",
                    "tagName": "div",
                    "props": {},
                    "children": [
                        {
                            "type": "component",
                            "tagName": "button",
                            "props": {
                                "label": "Button",
                                "@click": "{ reverse }"
                            },
                            "children": [],
                            "parent": {
                                "type": "component",
                                "tagName": "div",
                                "props": {},
                                "parent": {
                                    "type": "component",
                                    "tagName": "template",
                                    "props": {},
                                    "parent": {
                                        "type": "component"
                                    },
                                    "style": {}
                                },
                                "style": {}
                            },
                            "style": {}
                        },
                        {
                            "type": "component",
                            "tagName": "input",
                            "props": {
                                "value": "{ name }",
                                "hint": "Please input..."
                            },
                            "children": [],
                            "parent": {
                                "type": "component",
                                "tagName": "div",
                                "props": {},
                                "parent": {
                                    "type": "component",
                                    "tagName": "template",
                                    "props": {},
                                    "parent": {
                                        "type": "component"
                                    },
                                    "style": {}
                                },
                                "style": {}
                            },
                            "style": {}
                        }
                    ],
                    "parent": {
                        "type": "component",
                        "tagName": "template",
                        "props": {},
                        "parent": {
                            "type": "component"
                        },
                        "style": {}
                    },
                    "style": {}
                },
                {
                    "type": "component",
                    "tagName": "div",
                    "props": {},
                    "children": [
                        {
                            "type": "component",
                            "tagName": "checkbox",
                            "props": {
                                "value": "{ checked }",
                                "label": "Checkbox"
                            },
                            "children": [],
                            "parent": {
                                "type": "component",
                                "tagName": "div",
                                "props": {},
                                "parent": {
                                    "type": "component",
                                    "tagName": "template",
                                    "props": {},
                                    "parent": {
                                        "type": "component"
                                    },
                                    "style": {}
                                },
                                "style": {}
                            },
                            "style": {}
                        },
                        {
                            "type": "component",
                            "tagName": "radio",
                            "props": {
                                "value": "{ radioValue }",
                                "label": "Radio1",
                                "option": "foo"
                            },
                            "children": [],
                            "parent": {
                                "type": "component",
                                "tagName": "div",
                                "props": {},
                                "parent": {
                                    "type": "component",
                                    "tagName": "template",
                                    "props": {},
                                    "parent": {
                                        "type": "component"
                                    },
                                    "style": {}
                                },
                                "style": {}
                            },
                            "style": {}
                        },
                        {
                            "type": "component",
                            "tagName": "radio",
                            "props": {
                                "value": "{ radioValue }",
                                "label": "Radio2",
                                "option": "bar"
                            },
                            "children": [],
                            "parent": {
                                "type": "component",
                                "tagName": "div",
                                "props": {},
                                "parent": {
                                    "type": "component",
                                    "tagName": "template",
                                    "props": {},
                                    "parent": {
                                        "type": "component"
                                    },
                                    "style": {}
                                },
                                "style": {}
                            },
                            "style": {}
                        },
                        {
                            "type": "component",
                            "tagName": "switch",
                            "props": {
                                "value": "{ switchValue }"
                            },
                            "children": [],
                            "parent": {
                                "type": "component",
                                "tagName": "div",
                                "props": {},
                                "parent": {
                                    "type": "component",
                                    "tagName": "template",
                                    "props": {},
                                    "parent": {
                                        "type": "component"
                                    },
                                    "style": {}
                                },
                                "style": {}
                            },
                            "style": {}
                        }
                    ],
                    "parent": {
                        "type": "component",
                        "tagName": "template",
                        "props": {},
                        "parent": {
                            "type": "component"
                        },
                        "style": {}
                    },
                    "style": {}
                },
                {
                    "type": "component",
                    "tagName": "div",
                    "props": {},
                    "children": [
                        {
                            "type": "component",
                            "tagName": "color",
                            "props": {
                                "value": "{ colorValue }"
                            },
                            "children": [],
                            "parent": {
                                "type": "component",
                                "tagName": "div",
                                "props": {},
                                "parent": {
                                    "type": "component",
                                    "tagName": "template",
                                    "props": {},
                                    "parent": {
                                        "type": "component"
                                    },
                                    "style": {}
                                },
                                "style": {}
                            },
                            "style": {}
                        },
                        {
                            "type": "component",
                            "tagName": "slider",
                            "props": {
                                "value": "{ percent }"
                            },
                            "children": [],
                            "parent": {
                                "type": "component",
                                "tagName": "div",
                                "props": {},
                                "parent": {
                                    "type": "component",
                                    "tagName": "template",
                                    "props": {},
                                    "parent": {
                                        "type": "component"
                                    },
                                    "style": {}
                                },
                                "style": {}
                            },
                            "style": {}
                        },
                        {
                            "type": "component",
                            "tagName": "select",
                            "props": {
                                "value": "{ selectValue }",
                                "options": "{ selectOptions }"
                            },
                            "children": [],
                            "parent": {
                                "type": "component",
                                "tagName": "div",
                                "props": {},
                                "parent": {
                                    "type": "component",
                                    "tagName": "template",
                                    "props": {},
                                    "parent": {
                                        "type": "component"
                                    },
                                    "style": {}
                                },
                                "style": {}
                            },
                            "style": {}
                        }
                    ],
                    "parent": {
                        "type": "component",
                        "tagName": "template",
                        "props": {},
                        "parent": {
                            "type": "component"
                        },
                        "style": {}
                    },
                    "style": {}
                }
            ],
            "parent": {
                "type": "component"
            },
            "style": {}
        },
        "script": {
            "data": {
                "name": "world",
                "imagePath": "demo.png",
                "checked": true,
                "radioValue": "bar",
                "switchValue": true,
                "colorValue": "red",
                "percent": 50,
                "selectValue": "",
                "selectOptions": [
                    "foo",
                    "bar",
                    "hello",
                    "world",
                    "aaa",
                    "bbb"
                ]
            },
            "methods": {
                "init": "init() {\n            let config = {\n                component: this.component,\n                id: 'image-demo',\n                property: 'border-radius',\n                template: value => `${value}px`,\n                start: 0,\n                end: 100,\n                duration: 2000,\n                delay: 500,\n                timingFunction: cubicBezier(0.25, 0.1, 0.25, 1),\n            }\n            timeline.add(new Animation(config))\n            timeline.start()\n        }",
                "reverse": "reverse() {\n            this.name = this.name.split('').reverse().join('')\n        }"
            }
        }
    }
}; main();