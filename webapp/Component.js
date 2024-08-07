/**
 * eslint-disable @sap/ui5-jsdocs/no-jsdoc
 */

sap.ui.define([
        "sap/ui/core/UIComponent",
        "sap/ui/Device",
        "operation/model/models"
    ],
    function (UIComponent, Device, models) {
        "use strict";

        return UIComponent.extend("operation.Component", {
            metadata: {
                manifest: "json"
            },

            /**
             * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
             * @public
             * @override
             */
            init: function () {
                // call the base component's init function
                UIComponent.prototype.init.apply(this, arguments);

                // enable routing
                this.getRouter().initialize();

                // set the device model
                this.setModel(models.createDeviceModel(), "device");

                //excel
                var jQueryScript = document.createElement('script');
                jQueryScript.setAttribute('src', '/js/jszip.js');
                document.head.appendChild(jQueryScript);
            
                //excel
                var jQueryScript = document.createElement('script');
                jQueryScript.setAttribute('src', '/js/xlsx.js');
                document.head.appendChild(jQueryScript);
            }
        });
    }
);