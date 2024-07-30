sap.ui.define([
    "operation/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/ui/comp/valuehelpdialog/ValueHelpDialog",
    'sap/m/Token',
    'sap/ui/model/Filter',
	'sap/ui/model/FilterOperator',
    "sap/ui/core/library",
    "sap/m/ColumnListItem",
    "sap/m/Label",
    "sap/m/Column",
    "sap/ui/table/Column",
    'sap/m/Text'
],
function (Controller, JSONModel, MessageBox, ValueHelpDialog, Token, Filter, FilterOperator, coreLibrary, ColumnListItem, Label, MColumn, UIColumn, Text) {
    "use strict";

    return Controller.extend("operation.controller.Main", {
        onInit: function () {
            this.getRouter().getRoute("Main").attachMatched(this._onRouteMatched, this);

              //value help 초기 설정
              var oMultiInput;
              oMultiInput = this.byId("VHWC");
              this._oMultiInput = oMultiInput;
              this._oMultiInput.setTokens([]);
              
              var oMultiInput1 = this.byId("VHPlant");
              this._oMultiInput1 = oMultiInput1;
  
              // 비동기적으로 토큰을 설정
              this._getDefaultTokens().then(function (aTokens) {
                  oMultiInput1.setTokens(aTokens);
              }).catch(function (oError) {
                  MessageBox.error("토큰 설정 중 오류가 발생했습니다.");
              });
          },

        _onRouteMatched: function () {
            this._getData();
        },

        _getData: function () {
            var oMainModel = this.getOwnerComponent().getModel(); // 메인 모델 가져오기

            this._getODataRead(oMainModel, "/Operationcd").done(
                
                function(aGetData){
                
                // 데이터 읽기 성공 시 JSON 모델로 설정 , JSON 모델 객체를 생성한 후, 이 데이터를 모델에 설정
                this.setModel(new JSONModel(aGetData), "dataModel")
                
                // 데이터 읽기 실패 시 메시지 박스 표시
            }.bind(this)).fail(function(){
                MessageBox.information("Read Fail");
            }).always(function(){
                // 항상 실행되는 코드
            });
        },

        // 데이터 추가 버튼 +
        onAdd: function () {
            var oMainModel = this.getOwnerComponent().getModel();
        
            // OData 모델에서 플랜트 데이터를 읽어옴
            this._getODataRead(oMainModel, "/Plant").done(
                function (aPlantData) {
                    var sPlant = aPlantData.length > 0 ? aPlantData[0].Plant : "";
        
                    var oItem = {
                        Plant: sPlant,
                        OperationStandardTextCode: "",
                        OperationStandardTextCodeName: "",
                        WorkCenter: "",
                        WorkCenterText: ""
                    };
        
                    // dataModel에서 기존 데이터를 가져옴
                    var oDataModel = this.getView().getModel("dataModel");
                    var aItems = oDataModel.getProperty("/Items") || [];
        
                    // 새로운 행 추가
                    aItems.push(oItem);
        
                    oDataModel.setProperty("/Items", aItems);
                }.bind(this)
            ).fail(function () {
                MessageBox.information("플랜트 데이터를 불러오는데 실패했습니다.");
            });
        },

        //업로드
        onUpload: function (e) {
            var file = e.getParameter("files") && e.getParameter("files")[0];
            if (file) {
                this._import(file);
            } else {
                MessageBox.error("파일을 선택하세요.");
            }
        },
    
        _import: function (file) {
            var that = this;
            var excelData = {};
            if (file && window.FileReader) {
                var reader = new FileReader();
                reader.onload = function (e) {
                    var data = e.target.result;
                    var workbook = XLSX.read(data, {
                        type: 'binary'
                    });
                    workbook.SheetNames.forEach(function (sheetName) {
                        excelData = XLSX.utils.sheet_to_row_object_array(workbook.Sheets[sheetName]);

                        excelData.splice(0, 3);
                        console.log(excelData);
                        // 데이터 처리
                        var mappingIds = new Set();
                        var records = {};
        
                        excelData.forEach(function(row) {
                            var key = row.CnsldtnCOA + '|' + row.MappingID + '|' + row.Revision + '|' + row.CnsldtnUnit;
                            
                            if (!records[key]) {
                                records[key] = {
                                    'CnsldtnCOA': row.CnsldtnCOA,
                                    'MappingID': row.MappingID,
                                    'Revision': row.Revision,
                                    'CnsldtnUnit': row.CnsldtnUnit,
                                    'GrStatus': 0,
                                    items: []
                                };
                            }
                            
                            records[key].items.push({
                                'GLAccount': row.GLAccount,
                                'GLAccountLocalText': row.GLAccountLocalText,
                                'CnsldtnFSItem': row.CnsldtnFSItem,
                                'CnsldtnFSItemText': row.CnsldtnFSItemText
                            });

                            mappingIds.add(row.MappingID);
                        });
        
                        // 객체를 배열로 변환
                        excelData = Object.values(records);
                        console.log(excelData);
                        that.setModel(new JSONModel(excelData), 'excelModel');

                        var uniqueMappingIds = Array.from(mappingIds);
                        console.log(uniqueMappingIds);

                    });

                    // excelData.map( importData => {
                        //     var oMainModel = that.getOwnerComponent().getModel();
                        //     that.getOdataCreate(oMainModel, importData)

                        // })

                };
                reader.onerror = function (ex) {
                    console.log(ex);
                };
                reader.readAsBinaryString(file);
            }
        },
        
        // 플랜트 필터 조회 (ValueHelpDialog)
        onValueHelpPlant: function () {
            var oDialog = new ValueHelpDialog({
                title: "플랜트 조회",
                supportMultiselect: true,
                key: "Plant",
                // descriptionKey: "WorkCenterText",
                ok: function (oEvent) {
                    this.onValueHelpOkPress(oEvent);
                }.bind(this),
                cancel: function () {
                    this.onValueHelpCancelPress();
                }.bind(this)
            });

            this._oVHD = oDialog;
            this.getView().addDependent(oDialog);

            oDialog.getTableAsync().then(function (oTable) {
                oTable.setModel(this.valueModel);

                if (oTable.bindRows) {
                    oTable.bindAggregation("rows", {
                        path: "/",
                        events: {
                            dataReceived: function () {
                                oDialog.update();
                            }
                        }
                    });
                    var oColumnPlant = new UIColumn({
                        label: new Label({ text: "플랜트" }),
                        template: new Text({ text: "{Plant}" })
                    });
                    oColumnPlant.data("fieldName", "Plant");

                    oTable.addColumn(oColumnPlant);
                }

                 if (oTable.bindItems) {
                    oTable.bindAggregation("items", {
                        path: "/",
                        template: new ColumnListItem({
                            cells: [
                                new Label({ text: "{Plant}" })
                            ]
                        }),
                        events: {
                            dataReceived: function () {
                                oDialog.update();
                            }
                        }
                    });
                    oTable.addColumn(new MColumn({ header: new Label({ text: "플랜트" }) }));

                }

                oDialog.update();
            }.bind(this));

            oDialog.setTokens(this._oMultiInput1.getTokens());
            this.getPlantData();
            oDialog.open();
        },

        _getDefaultTokens: function () {
            var oMainModel = this.getOwnerComponent().getModel();

            // 비동기 OData 읽기 작업을 수행하는 함수
            return this._getODataRead(oMainModel, "/Plant").then(function (aPlantData) {
                if (aPlantData && aPlantData.length > 0) {
                    var sPlant = aPlantData[0].Plant;
                    var oToken1 = new Token({
                        key: sPlant,
                        text: sPlant
                    });
                    return [oToken1]; // 토큰 배열 반환
                } else {
                    throw new Error("플랜트 데이터를 찾을 수 없습니다.");
                }
            }).catch(function (oError) {
                // 에러 처리
                console.error("플랜트 데이터를 찾을 수 없습니다.", oError);
                throw oError;
            });
        },
        
        // 작업장 필터 조회 (ValueHelpDialog)
        onValueHelpWC: function () {
            var oDialog = new ValueHelpDialog({
                title: "작업장 조회",
                supportMultiselect: true,
                key: "WorkCenter",
                descriptionKey: "WorkCenterText",
                ok: function (oEvent) {
                    this.onValueHelpOkPress(oEvent);
                }.bind(this),
                cancel: function () {
                    this.onValueHelpCancelPress();
                }.bind(this)
            });

            this._oVHD = oDialog;
            this.getView().addDependent(oDialog);

            oDialog.getTableAsync().then(function (oTable) {
                oTable.setModel(this.valueModel);

                if (oTable.bindRows) {
                    oTable.bindAggregation("rows", {
                        path: "/",
                        events: {
                            dataReceived: function () {
                                oDialog.update();
                            }
                        }
                    });
                    var oColumnWorkCenterCategoryCode = new UIColumn({
                        label: new Label({ text: "범주" }),
                        template: new Text({ text: "{WorkCenterCategoryCode}" })
                    });
                    oColumnWorkCenterCategoryCode.data("fieldName", "WorkCenterCategoryCode");

                    var oColumnPlant = new UIColumn({
                        label: new Label({ text: "플랜트" }),
                        template: new Text({ text: "{Plant}" })
                    });
                    oColumnPlant.data("fieldName", "Plant");

                    var oColumnWorkCenter = new UIColumn({
                        label: new Label({ text: "작업장" }),
                        template: new Text({ text: "{WorkCenter}" })
                    });
                    oColumnWorkCenter.data("fieldName", "WorkCenter");

                    var oColumnWorkCenterText = new UIColumn({
                        label: new Label({ text: "작업장명" }),
                        template: new Text({ text: "{WorkCenterText}" })
                    });
                    oColumnWorkCenterText.data("fieldName", "WorkCenterText");

                    var oColumnLanguage = new UIColumn({
                        label: new Label({ text: "언어" }),
                        template: new Text({ text: "{Language}" })
                    });
                    oColumnLanguage.data("fieldName", "Language");

                    oTable.addColumn(oColumnWorkCenterCategoryCode);
                    oTable.addColumn(oColumnPlant);
                    oTable.addColumn(oColumnWorkCenter);
                    oTable.addColumn(oColumnWorkCenterText);
                    oTable.addColumn(oColumnLanguage);
                }

                 if (oTable.bindItems) {
                    oTable.bindAggregation("items", {
                        path: "/",
                        template: new ColumnListItem({
                            cells: [
                                new Label({ text: "{WorkCenterCategoryCode}" }),
                                new Label({ text: "{Plant}" }),
                                new Label({ text: "{WorkCenter}" }),
                                new Label({ text: "{WorkCenterText}" }),
                                new Label({ text: "{Language}" })
                            ]
                        }),
                        events: {
                            dataReceived: function () {
                                oDialog.update();
                            }
                        }
                    });
                    oTable.addColumn(new MColumn({ header: new Label({ text: "범주" }) }));
                    oTable.addColumn(new MColumn({ header: new Label({ text: "플랜트" }) }));
                    oTable.addColumn(new MColumn({ header: new Label({ text: "작업장" }) }));
                    oTable.addColumn(new MColumn({ header: new Label({ text: "작업장명" }) }));
                    oTable.addColumn(new MColumn({ header: new Label({ text: "언어" }) }));

                }

                oDialog.update();
            }.bind(this));

            oDialog.setTokens(this._oMultiInput.getTokens());
            this.getWCData();
            oDialog.open();
        },


        // select 버튼
        onValueHelpOkPress: function (oEvent) {
            // 선택된 토큰들을 가져옴
            var aTokens = oEvent.getParameter("tokens");

            // 가져온 토큰들을 _oMultiInput에 설정
            this._oMultiInput.setTokens(aTokens);

            // 다이얼로그 닫기
            this._oVHD.close();
        },

        // cancel 버튼
        onValueHelpCancelPress: function () {
            // 다이얼로그 닫기
            this._oVHD.close();
        },

        // 다이얼로그가 닫힌 후 호출
        onValueHelpAfterClose: function () {
            // 다이얼로그 객체 파기
            this._oVHD.destroy();
        },
        
        getWCData: function () {
            var oWCModel = this.getOwnerComponent().getModel();
        
            this._getODataRead(oWCModel, "/Workcenter").done(
                function (oData) {
                    var oTable = this._oVHD.getTable();
                    oTable.setModel(new JSONModel(oData));
                    oTable.bindRows("/");
                    this._oVHD.update();
                }.bind(this)).fail(function(){
                // 데이터 읽기 실패 시 메시지 박스 표시
                    sap.m.MessageBox.error("작업장 데이터를 가져오는 데 실패했습니다.");
           
            }).always(function(){
                // 항상 실행되는 코드
            });
        },
        getPlantData: function () {
            var oPlantModel = this.getOwnerComponent().getModel();
        
            this._getODataRead(oPlantModel, "/Plant").done(
                function (oData) {
                    var oTable = this._oVHD.getTable();
                    oTable.setModel(new JSONModel(oData));
                    oTable.bindRows("/");
                    this._oVHD.update();
                }.bind(this)).fail(function(){
                // 데이터 읽기 실패 시 메시지 박스 표시
                    sap.m.MessageBox.error("작업장 데이터를 가져오는 데 실패했습니다.");
           
            }).always(function(){
                // 항상 실행되는 코드
            });
        }
    });
});
