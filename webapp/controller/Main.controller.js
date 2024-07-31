sap.ui.define([
    "operation/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/ui/comp/valuehelpdialog/ValueHelpDialog",
    'sap/m/Token',
    'sap/ui/model/Filter',
    'sap/ui/model/FilterOperator',
    "sap/ui/export/library",
    "sap/m/ColumnListItem",
    "sap/m/Label",
    "sap/m/Column",
    "sap/ui/table/Column",
    'sap/m/Text',
    "sap/ui/export/Spreadsheet"
], function (Controller, JSONModel, MessageBox, ValueHelpDialog, Token, Filter, FilterOperator, exportLibrary, ColumnListItem, Label, MColumn, UIColumn, Text, Spreadsheet) {
    "use strict";

    var EdmType = exportLibrary.EdmType;

    return Controller.extend("operation.controller.Main", {
        onInit: function () {
            this.getRouter().getRoute("Main").attachMatched(this._onRouteMatched, this);

        },

        _onRouteMatched: function () {
            this._getData();
        },

        _getData: function () {
            var oMainModel = this.getOwnerComponent().getModel(); // 메인 모델 가져오기
            this._getODataRead(oMainModel, "/Operationcd").done(
                function(aGetData) {
                    // 데이터 읽기 성공 시 JSON 모델로 설정
                    this.setModel(new JSONModel({ Items: aGetData }), "dataModel");
                    this.MultiInputs("VHWC"); // 필터_작업장
                    this.MultiInputs("VHOpCode"); // 필터_공정코드
                    this.MultiInputs("VHPlant", true); //필터_플랜트
                    this.MultiInputs("operationid") // 테이블_공정코드
                    this.MultiInputs("workcenter") // 테이블_작업장
                    this.ResetBtn();    
                }.bind(this)
            ).fail(function() {
                MessageBox.information("테이블 데이터를 읽어올 수 없습니다.");
            });
           
        },        

         // MultiInput 초기화 및 토큰 설정
         MultiInputs: function (sMultiInputId, bSetDefaultTokens) {
            var oMultiInput = this.byId(sMultiInputId);
            oMultiInput.setTokens([]);
        
            if (bSetDefaultTokens) {
                this._getDefaultTokens(sMultiInputId).then(function (aTokens) {
                    oMultiInput.setTokens(aTokens);
                    this.PlantFilter(); // 플랜트 필터 적용
                }.bind(this)).catch(function (oError) {
                    MessageBox.error("토큰 설정 중 오류가 발생했습니다.");
                });
            }
        },

        // PlantFilter: function () {
        //     var oTable = this.byId("dataTable");
        //     var oPlantFilter = this.byId("VHPlant").getTokens()[0]; // 기본 토큰 사용
        //     var sPlant = oPlantFilter ? oPlantFilter.getKey() : "";

        //     if (sPlant) {
        //         var oFilter = new Filter("Plant", FilterOperator.EQ, sPlant);
        //         oTable.getBinding("items").filter(oFilter);
        //     } else {
        //         oTable.getBinding("items").filter([]);
        //     }
        // },

        PlantFilter: function () {
            var oTable = this.byId("dataTable");
            if (!oTable) {
                MessageBox.error("테이블을 찾을 수가 없습니다.");
                return;
            }
        
            var oBinding = oTable.getBinding("items");
            if (!oBinding) {
                MessageBox.error("테이블에서 아이템 바인딩을 할 데이터를 찾을 수 없습니다.");
                return;
            }
        
            var oPlantFilter = this.byId("VHPlant").getTokens()[0]; // 기본 토큰 사용
            var sPlant = oPlantFilter ? oPlantFilter.getKey() : ""; //ex) 4310
           
            if (sPlant) {
                var oFilter = new Filter("Plant", FilterOperator.EQ, sPlant);
                oBinding.filter(oFilter);
            } else {
                oBinding.filter([]);
            }
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

        // 데이터 삭제 버튼
        onDelete: function () {
            var oTable = this.byId("dataTable");
            var aSelectedItems = oTable.getSelectedItems(); // 선택된 항목을 가져오기
            var oDataModel = this.getModel("dataModel");
            var aData = oDataModel.getProperty("/Items");
        
            if (aSelectedItems.length === 0) {
                MessageBox.information("선택한 항목이 없습니다.");
                return;
            }
        
            // 삭제할 항목 배열 생성
            if (!this.aItemsToDelete) {
                this.aItemsToDelete = [];
            }
        
            // 선택된 항목의 데이터를 aItemsToDelete 배열에 추가
            aSelectedItems.forEach(function (oItem) {
                var oContext = oItem.getBindingContext("dataModel");
                var oRowData = oContext.getObject();
                this.aItemsToDelete.push(oRowData);
            }.bind(this));
        
            // 선택된 항목을 모델 데이터에서 제거
            aSelectedItems.reverse().forEach(function (oItem) {
                var oContext = oItem.getBindingContext("dataModel");
                var iIndex = oContext.getPath().split('/').pop(); // 인덱스를 계산
                aData.splice(iIndex, 1);
            });
        
            // 모델의 데이터 업데이트
            oDataModel.setProperty("/Items", aData);
        
            // 모델 새로고침
            oDataModel.refresh();
            
            // 선택 해제
            oTable.removeSelections(true);
        },        
        
        // 수정
        onEdit: function () {
            this.getId("btnEdit").setVisible("false");
            this.getId("upload").setVisible("false");
            this.getId("download").setVisible("false");
            this.getId("btnSave").setVisible("true");
            this.getId("add").setVisible("true");
            this.getId("delete").setVisible("true");
            this.getId("operationid").setVisible("true");
            this.getId("workcenter").setVisible("true");
        },

        //조회 첫 화면 (버튼 리셋)
        ResetBtn: function () {
            this.getId("btnEdit").setVisible("true");
            this.getId("upload").setVisible("true");
            this.getId("download").setVisible("true");
            this.getId("btnSave").setVisible("false");
            this.getId("add").setVisible("false");
            this.getId("delete").setVisible("false");
            this.getId("operationid").setVisible("false");
            this.getId("workcenter").setVisible("false");
        },
        // 푸터 - 취소 버튼
        onCancel: function () {
            this._getData();
        },

        // 엑셀 다운로드
        onDownload: function () {
            var aCols, oRowBinding, oSettings, oSheet, oTable;
            var aData = [0]; // 데이터가 없는 경우 템플릿으로 사용할 빈 데이터 배열
        
            // 테이블 객체가 이미 존재하지 않으면 가져옴
            if (!this._oTable) {
                this._oTable = this.byId('dataTable');
            }
        
            // 테이블과 바인딩을 가져옴
            oTable = this._oTable;
            oRowBinding = oTable.getBinding('items');
        
            // 컬럼 설정을 생성
            aCols = this.createColumnConfig();
        
            // 데이터가 있는지 확인
            if (oRowBinding.getLength() > 0) {
                // 데이터가 있는 경우, 데이터 바인딩을 가져옴
                oSettings = {
                    workbook: {
                        columns: aCols,
                        hierarchyLevel: 'Level' // 계층 구조 레벨 설정
                    },
                    dataSource: oRowBinding, // 데이터 소스 설정
                    fileName: '다인정공_공정 기준 정보.xlsx', // 다운로드 파일 이름 설정
                    worker: false // 워커 사용 여부 (테이블 안 보이게)
                };
            } else {
                // 데이터가 없는 경우, 빈 데이터 배열을 사용하여 템플릿 다운로드
                oSettings = {
                    workbook: {
                        columns: aCols,
                        hierarchyLevel: 'Level' // 계층 구조 레벨 설정
                    },
                    dataSource: aData, // 빈 데이터 배열
                    fileName: '다인정공_공정 기준 정보_템플릿.xlsx', // 다운로드 파일 이름 설정
                    worker: false // 워커 사용 여부 (테이블 안 보이게)
                };
            }
        
            // 엑셀 파일을 생성하고 다운로드
            oSheet = new Spreadsheet(oSettings);
            oSheet.build().finally(function() {
                oSheet.destroy();
            });
        },
        
        // 엑셀파일로 데이터 내보내기
        createColumnConfig: function() {
            var aCols = [];
            // 컬럼 라벨과 속성을 정의
            var labels = ['플랜트', '공정코드', '공정명', '작업장', '작업장명'];
            var properties = ['Plant', 'Operationid', 'OperationStandardTextCodeName', 'Workcenter', 'WorkCenterText'];
        
            // 라벨과 속성을 매핑하여 컬럼 설정 배열을 생성
            labels.forEach(function (label, index) {
                aCols.push({
                    label: label,
                    property: properties[index],
                    type: EdmType.String
                });
            });
            return aCols; // 컬럼 설정 배열 반환
        },        

        //엑셀 업로드
        onUpload: function (e) {
            var file = e.getParameter("files") && e.getParameter("files")[0];
            if (file) {
                this._import(file);
            } else {
                MessageBox.error("파일을 선택하세요.");
            }
        },
        
        _import: function (file) {
            var oMainModel = this.getOwnerComponent().getModel();
            if (file && window.FileReader) {
                var reader = new FileReader();
                reader.onload = function (e) {
                    var data = e.target.result;
                    var workbook = XLSX.read(data, {
                        type: 'binary'
                    });
                    workbook.SheetNames.forEach(function (sheetName) {
                        var excelData = XLSX.utils.sheet_to_row_object_array(workbook.Sheets[sheetName]);
                        console.log(excelData);
        
                        // 필드 값을 추출하기 전에 Plant 값을 가져오기
                        this._getODataRead(oMainModel, "/Plant").done(function (aPlantData) {
                            var sPlant =aPlantData[0].Plant;
        
                            // 필드 값 추출 및 Plant 값 추가
                            var filteredData = excelData.map(function (row) {
                                return {
                                    Plant: sPlant, // Plant 값을 추가
                                    Operationid: row["공정코드"] || row["Operationid"],
                                    Workcenter: row["작업장"] || row["Workcenter"]
                                };
                            });
        
                            console.log(filteredData);
        
                            // OData 생성 요청
                            filteredData.forEach(function (oData) {
                                this._getODataCreate(oMainModel, "/Operationcd", oData).fail(function () {
                                    MessageBox.information("생성에 실패하였습니다.");
                                });
                            }.bind(this));
        
                            // 데이터 갱신
                            this._getData();
                        }.bind(this)).fail(function () {
                            MessageBox.information("플랜트 데이터를 불러오는데 실패했습니다.");
                        });
        
                    }.bind(this)); // this를 유지하기 위해 bind 사용
                }.bind(this); // this를 유지하기 위해 bind 사용
                reader.onerror = function (ex) {
                    console.log(ex);
                };
                reader.readAsBinaryString(file);
            }
        },
        // 공통 다이얼로그 및 테이블 설정 함수
        _createValueHelpDialog: function (sTitle, sKey, aColumns, aItems, sMultiInputId) {
            var oDialog = new ValueHelpDialog({
                title: sTitle,
                supportMultiselect: true,
                key: sKey,
                ok: function (oEvent) {
                    this.onValueHelpOkPress(oEvent, sMultiInputId);
                }.bind(this),
                cancel: function () {
                    this.onValueHelpCancelPress();
                }.bind(this),
                afterClose: this.onValueHelpAfterClose.bind(this)
            });
        
            this._oVHD = oDialog;
            this.getView().addDependent(oDialog);
        
            // MultiInput에 설정된 기존 토큰들을 다이얼로그에 설정
            var oMultiInput = this.byId(sMultiInputId);
            oDialog.setTokens(oMultiInput.getTokens());
        
            oDialog.getTableAsync().then(function (oTable) {
                oTable.setModel(this.valueModel);
        
                // Check for binding type and bind accordingly
                if (oTable.bindRows) {
                    oTable.bindAggregation("rows", {
                        path: "/",
                        events: {
                            dataReceived: function () {
                                oDialog.update();
                            }
                        }
                    });
                    aColumns.forEach(function (oColumn) {
                        oTable.addColumn(oColumn);
                    });
                }
        
                if (oTable.bindItems) {
                    oTable.bindAggregation("items", {
                        path: "/",
                        template: new ColumnListItem({
                            cells: aItems
                        }),
                        events: {
                            dataReceived: function () {
                                oDialog.update();
                            }
                        }
                    });
                    aColumns.forEach(function (oColumn) {
                        oTable.addColumn(oColumn);
                    });
                }
        
                oDialog.update();
            }.bind(this)).catch(function (oError) {
                console.error("테이블 로딩에 문제가 생겼습니다.", oError);
            });
        
            oDialog.open();
        },        

        // OK 버튼 핸들러
        onValueHelpOkPress: function (oEvent, sMultiInputId) {
            console.log(oEvent);
            var aTokens = oEvent.getParameter("tokens");
            console.log(aTokens);
            var oMultiInput = this.byId(sMultiInputId); // 선택된 MultiInput 필드 가져오기
            oMultiInput.setTokens(aTokens);
            this._oVHD.close();
        },

        // Cancel 버튼 핸들러
        onValueHelpCancelPress: function () {
            this._oVHD.close();
        },

        // 다이얼로그가 닫힌 후 호출
        onValueHelpAfterClose: function () {
            this._oVHD.destroy();
        },

        // 플랜트  default 값
        _getDefaultTokens: function (sMultiInputId) {
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

        onValueHelps: function (oEvent) {

            var sMultiInputId = oEvent.getSource().getId(); // 이벤트 소스의 ID를 가져오기
            
            // 필터_플랜트
            if (sMultiInputId === this.byId("VHPlant").getId()) {
                var aColumns = [
                    new UIColumn({
                        label: new Label({ text: "플랜트" }),
                        template: new Text({ text: "{Plant}" })
                    })
                ];
                
                var aItems = [
                    new Label({ text: "{Plant}" })
                ];
                
                this._createValueHelpDialog("플랜트 조회", "Plant", aColumns, aItems, "VHPlant");
                this.getPlantData();
            
            // 필터_공정코드
            } else if (sMultiInputId === this.byId("VHOpCode").getId()) {
                var aColumns = [
                    new UIColumn({
                        label: new Label({text: "공정코드"}),
                        template: new Text({ text: "{OperationStandardTextCode}" })
                    }),
                    new UIColumn({
                        label: new Label({text: "공정명"}),
                        template: new Text({ text: "{OperationStandardTextCodeName}" })
                    }),
                ];
                var aItems = [
                    new Label({ text: "{OperationStandardTextCode}" }),
                    new Label({ text: "{OperationStandardTextCodeName}" })
                ];
                
                this._createValueHelpDialog("공정코드 조회", "OperationStandardTextCode", aColumns, aItems, "VHOpCode");
                this.getOpCodeData();

            // 필터_작업장
            } else if (sMultiInputId === this.byId("VHWC").getId() || sMultiInputId === this.byId("workcenter").getId()) {
                var aColumns = [
                    new UIColumn({
                        label: new Label({ text: "범주" }),
                        template: new Text({ text: "{WorkCenterCategoryCode}" })
                    }),
                    new UIColumn({
                        label: new Label({ text: "플랜트" }),
                        template: new Text({ text: "{Plant}" })
                    }),
                    new UIColumn({
                        label: new Label({ text: "작업장" }),
                        template: new Text({ text: "{WorkCenter}" })
                    }),
                    new UIColumn({
                        label: new Label({ text: "작업장명" }),
                        template: new Text({ text: "{WorkCenterText}" })
                    }),
                    new UIColumn({
                        label: new Label({ text: "언어" }),
                        template: new Text({ text: "{Language}" })
                    })
                ];
                
                var aItems = [
                    new Label({ text: "{WorkCenterCategoryCode}" }),
                    new Label({ text: "{Plant}" }),
                    new Label({ text: "{WorkCenter}" }),
                    new Label({ text: "{WorkCenterText}" }),
                    new Label({ text: "{Language}" })
                ];

                if(sMultiInputId === this.byId("VHWC").getId()){

                    this._createValueHelpDialog("작업장 조회", "WorkCenter", aColumns, aItems, "VHWC");

                } else {

                    this._createValueHelpDialog("작업장 조회", "WorkCenter", aColumns, aItems, "workcenter");
                }
                this.getWCData();

            } else if (sMultiInputId === this.byId("operationid").getId()){

            }
        },        

        // 플랜트 데이터
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
                    sap.m.MessageBox.error("플랜트 데이터를 가져오는 데 실패했습니다.");
           
            }).always(function(){
                // 항상 실행되는 코드
            });
        },

        // 공정코드 데이터
        getOpCodeData: function () {
            var oPlantModel = this.getOwnerComponent().getModel();
        
            this._getODataRead(oPlantModel, "/Operationid").done(
                function (oData) {
                    var oTable = this._oVHD.getTable();
                    oTable.setModel(new JSONModel(oData));
                    oTable.bindRows("/");
                    this._oVHD.update();
                }.bind(this)).fail(function(){
                // 데이터 읽기 실패 시 메시지 박스 표시
                    sap.m.MessageBox.error("공정코드 데이터를 가져오는 데 실패했습니다.");
           
            }).always(function(){
                // 항상 실행되는 코드
            });
        },

         // 작업장 데이터
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
        }
    });
});
