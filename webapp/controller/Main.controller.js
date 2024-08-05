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
    "sap/ui/export/Spreadsheet",
    'sap/ui/core/Fragment'
], function (Controller, JSONModel, MessageBox, ValueHelpDialog, Token, Filter, FilterOperator, exportLibrary, ColumnListItem, Label, MColumn, UIColumn, Text, Spreadsheet, Fragment) {
    "use strict";

    var EdmType = exportLibrary.EdmType;

    return Controller.extend("operation.controller.Main", {
        onInit: function () {
            this.getRouter().getRoute("Main").attachMatched(this._onRouteMatched, this);
            this._setModel(); 
        },

        _onRouteMatched: function () {
            this._getData();
        },

        _getData: function () {
            var oMainModel = this.getOwnerComponent().getModel(); // 메인 모델 가져오기

             // 공통 데이터 모델 가져오기 (작업장, 공정코드)
            var commonModelData = function(url, modelName) { // (/DB이름 , sampleModel)
                return this._getODataRead(oMainModel, url).then(function(data) {
                    this.setModel(new JSONModel(data), modelName);
                }.bind(this));
            }.bind(this);

            Promise.all([
                commonModelData("/Operationid", "opiModel"),
                commonModelData("/Workcenter", "wcModel")
            
            ]).then(function() {
                var opiModel = this.getModel("opiModel").getData();
                var oWcModel = this.getModel("wcModel").getData();
            
            // Operationcd 데이터를 가져오는 작업
            this._getODataRead(oMainModel, "/Operationcd").done(
                function(aGetData) {
                    aGetData.forEach(function(item){
                        var wcdata = item.Workcenter; // 작업장 코드
                        var wcdataText = item.WorkcenterText; // 모델에 넣어 줄 작업장명
                        var opidata = item.Operationid; // 공정코드
                        var opidataText = item.OperationidText; // 모델에 넣어 줄 공정코드명
                        oWcModel.forEach(function(wcitem){
                            var wcdatas = wcitem.WorkCenter

                            if(wcdata === wcdatas){
                                var wcdatasText = wcitem.WorkCenterText;
                                wcdataText = wcdatasText
                            }
                        });
                        opiModel.forEach(function(opitem){
                            var opidatas = opitem.OperationStandardTextCode;
                            if(opidata === opidatas){
                                var opidatasText = opitem.OperationStandardTextCodeName;
                                opidataText = opidatasText
                            }
                        });
                        item.WorkcenterText = wcdataText;
                        item.OperationidText = opidataText;
                    });
                    // 데이터 읽기 성공 시 JSON 모델로 설정
                    this.setModel(new JSONModel({ Items: aGetData }), "dataModel");
                    this.MultiInputs("VHWC"); // 필터_작업장
                    this.MultiInputs("VHOpCode"); // 필터_공정코드
                    this.MultiInputs("VHPlant", true); //필터_플랜트
            
                    }.bind(this)
                ).fail(function() {
                    MessageBox.information("테이블 데이터를 읽어올 수 없습니다.");
                });
            }.bind(this)).catch(function(error) {
                MessageBox.error(error); // 에러 처리
            })
        },  

        // 메인 화면 visible editable 변경 모델
        _setModel: function () {
            var oChangeModel = new JSONModel({
                editable: false,
                visibleEdit: false, // 수정 버튼 눌렀을 때 보이는 버튼: 추가, 삭제
                visibleGet: true,   // 조회 화면에서 보이는 버튼: 업로드, 다운로드
                // buttonText: "수정"
            });
            this.getView().setModel(oChangeModel, "changeModel");
        },

        // 버튼 및 텍스트 변경 (수정/ 저장)
        toggleEditMode: function(EditMode) {
            var oChangeModel = this.getView().getModel("changeModel");
        
            oChangeModel.setProperty("/editable", EditMode); //테이블 valuehelp 수정가능
            oChangeModel.setProperty("/visibleGet", !EditMode); //조회 버튼 비활성화
            // oChangeModel.setProperty("/buttonText", EditMode ? "저장" : "수정");
            oChangeModel.setProperty("/visibleEdit", EditMode); //수정 버튼 활성화
        },

        // 필터 검색
        onSearch: function () {
            var aPlantTokens = this.byId("VHPlant").getTokens().map(function (token) {
                return token.getKey();
            });
            var aOpCodeTokens = this.byId("VHOpCode").getTokens().map(function (token) {
                return token.getKey();
            });
            var aWCTokens = this.byId("VHWC").getTokens().map(function (token) {
                return token.getKey();
            });
        
        
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
        
            var aFilters = [];
        
            if (aPlantTokens.length > 0) {
                var aPlantFilters = aPlantTokens.map(function (token) {
                    return new Filter({
                        path: "Plant",
                        operator: FilterOperator.EQ,
                        value1: token
                    });
                });
                aFilters.push(new Filter({
                    filters: aPlantFilters,
                    and: false // OR 조건
                }));
            } else {
                MessageBox.error("플랜트 값 선택은 필수입니다.");
                return;
            }
        
            if (aOpCodeTokens.length > 0) {
                var aOpCodeFilters = aOpCodeTokens.map(function (token) {
                    return new Filter({
                        path: "Operationid",
                        operator: FilterOperator.EQ,
                        value1: token
                    });
                });
                aFilters.push(new Filter({
                    filters: aOpCodeFilters,
                    and: false 
                }));
            }
        
            if (aWCTokens.length > 0) {
                var aWCFilters = aWCTokens.map(function (token) {
                    return new Filter({
                        path: "Workcenter",
                        operator: FilterOperator.EQ,
                        value1: token
                    });
                });
                aFilters.push(new Filter({
                    filters: aWCFilters,
                    and: false 
                }));
            }
        
            if (aFilters.length > 0) {
                oBinding.filter(new Filter({
                    filters: aFilters,
                    and: true
                }));
            } else {
                oBinding.filter([]);
            }
        },        

        onSave: function () {
            var oChangeModel = this.getModel("changeModel");
            var Editable = oChangeModel.getProperty("/editable");
            this.toggleEditMode(!Editable);
            
            var oMainModel = this.getOwnerComponent().getModel();
            var oDataModel = this.getModel("dataModel");
            var aData = oDataModel.getData().Items;
        
            // 기존 데이터 삭제
            this._getODataRead(oMainModel, "/Operationcd").done(function (aGetData) {
                var deletePromises = aGetData.map(function (item) {
                    var suuid = item.Uuid;
                    var deleteUrl = "/Operationcd(guid'" + suuid + "')"; // URL 포맷 수정
                    return this._getODataDelete(oMainModel, deleteUrl);
                }.bind(this));
        
                // 모든 삭제가 완료된 후 새 데이터 저장
                $.when.apply($, deletePromises).done(function () {
                    // 데이터 필터링 및 중복 제거
                    var aFilteredData = aData.filter(function (item) {
                        return item.Plant && item.Operationid && item.Workcenter;
                    });
        
                    var saveData = [];
                    var duplicateData = {};
        
                    aFilteredData.forEach(function (item) {
                        var opiwc = item.Operationid + "_" + item.Workcenter;
                        if (!duplicateData[opiwc]) {
                            duplicateData[opiwc] = true;
                            saveData.push({
                                Operationid: item.Operationid,
                                Workcenter: item.Workcenter,
                                Plant: item.Plant
                            });
                        }
                    });
        
                    // 데이터 저장 요청
                    saveData.forEach(function (oData) {
                        this._getODataCreate(oMainModel, "/Operationcd", oData).fail(function () {
                            MessageBox.information("데이터 저장에 실패하였습니다.");
                        });
                    }.bind(this));
                    MessageBox.information("데이터 저장에 성공하였습니다.");
                    // 데이터 새로고침
                    this._getData();
                }.bind(this)).fail(function (oError) {
                    MessageBox.error("삭제 중 오류가 발생했습니다. 오류: " + oError.message);
                });
            }.bind(this));
        },        

        // 푸터 - 취소 버튼
        onCancel: function () {
            this.toggleEditMode(false);
            this._getData();
        },

        //  수정 버튼
        onEdit: function () {
            this.toggleEditMode(true);
        },

        // 공정 코드 value help
        opiValueHelp: function (oEvent) {
            var sInputId = oEvent.getSource().getId();
            var oView = this.getView();
            var rowId = oEvent.getSource().getParent().getBindingContext("dataModel").getPath().split("/").pop();
            this.inputRow = rowId;
        
            if (sInputId.includes("operationid")) {
                Fragment.load({
                    id: oView.getId() + this.inputRow, // 고유 아이디 생성
                    name: "operation.view.Fragments.OperationId",
                    controller: this
                }).then(function (oValueHelpDialog) {
                    oView.addDependent(oValueHelpDialog);
                    oValueHelpDialog.open();
                }).catch(function (oError) {
                    console.error("공정 코드 Value Help를 여는데 실패하였습니다.", oError);
                });
            }
        },        
        
        wcValueHelp: function (oEvent) {
            var sInputId = oEvent.getSource().getId();
            console.log("sid",sInputId);
            var oView = this.getView();
            var rowId = oEvent.getSource().getParent().getBindingContext("dataModel").getPath().split("/").pop();
            this.inputRow = rowId;
        
            if (sInputId.includes("workcenter")) {
                this._pWorkCenterValueHelpDialog = Fragment.load({
                id: oView.getId()+this.inputRow,
                name: "operation.view.Fragments.WorkCenter",
                controller: this
                }).then(function(oValueHelpDialog){
                oView.addDependent(oValueHelpDialog);
                return oValueHelpDialog;
                });
                this._pWorkCenterValueHelpDialog.then(function(oValueHelpDialog){
    
                    oValueHelpDialog.open();
                });
            }
        },

        opiVhSearch : function (oEvent) {
            var sValue = oEvent.getParameter("value");
            var oFilter = new Filter(
                "OperationStandardTextCode",
                FilterOperator.Contains, sValue
            );
            oEvent.getSource().getBinding("items").filter([oFilter]);
        },

        opiVhClose: function (oEvent) {
            var oSelectedItem = oEvent.getParameter("selectedItem");
            if (oSelectedItem) {
                var sPath = oSelectedItem.getBindingContext("opiModel").getPath();
                var oSelectedData = this.getModel("opiModel").getProperty(sPath);
                var items = this.getModel("dataModel").getData().Items;
                items[this.inputRow].Operationid = oSelectedData.OperationStandardTextCode;
    
                items[this.inputRow].OperationidText = oSelectedData.OperationStandardTextCodeName;
                this.getModel("dataModel").updateBindings();
            }
            oEvent.getSource().getBinding("items").filter([]);
        },

        wcVhSearch : function (oEvent) {
                var sValue = oEvent.getParameter("value");
                var oFilter = new Filter(
                "WorkCenter",
                FilterOperator.Contains, sValue
                );
                oEvent.getSource().getBinding("items").filter([oFilter]);
            },

        wcVhClose: function (oEvent) {
            var oSelectedItem = oEvent.getParameter("selectedItem");
            if (oSelectedItem) {
                var sPath = oSelectedItem.getBindingContext("wcModel").getPath();
                var oSelectedData = this.getModel("wcModel").getProperty(sPath);
                var items = this.getModel("dataModel").getData().Items;
                items[this.inputRow].Workcenter = oSelectedData.WorkCenter;
        
                items[this.inputRow].WorkcenterText = oSelectedData.WorkCenterText;

                this.getModel("dataModel").updateBindings();
            }
            oEvent.getSource().getBinding("items").filter([]);
        },

         // MultiInput 초기화 및 토큰 설정
         MultiInputs: function (sMultiInputId, setDefaultTokens) {
            var oMultiInput = this.byId(sMultiInputId);
            oMultiInput.setTokens([]);
        
            if (setDefaultTokens) {
                this._getDefaultTokens(sMultiInputId).then(function (aTokens) {
                    oMultiInput.setTokens(aTokens);
                    this.PlantFilter(); // 플랜트 필터 적용
                }.bind(this)).catch(function (oError) {
                    MessageBox.error("토큰 설정 중 오류가 발생했습니다.");
                });
            
            }
        },

        // 플랜트  default 값
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

        // 플랜트 필터 (테이블 필터링)
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
                    Operationid: "",
                    OperationidText: "",
                    Workcenter: "",
                    WorkcenterText: ""
                };

                // dataModel에서 기존 데이터를 가져옴
                var oDataModel = this.getModel("dataModel");
                var aItems = oDataModel.getProperty("/Items") || [];

                // 새로운 행을 맨 앞에 추가
                aItems.unshift(oItem);

                oDataModel.setProperty("/Items", aItems);

                // 바인딩 업데이트
                oDataModel.updateBindings();
                
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
            console.log(oRowData);
        }.bind(this));

        // 선택된 항목을 모델 데이터에서 제거
        var aIndexesToDelete = aSelectedItems.map(function (oItem) {
            var oContext = oItem.getBindingContext("dataModel");
            var sPath = oContext.getPath();
            return parseInt(sPath.split('/').pop(), 10); // 인덱스를 숫자로 변환
        });

        // 인덱스를 역순으로 정렬하여 제거
        aIndexesToDelete.sort(function (a, b) {
            return b - a;
        }).forEach(function (index) {
            aData.splice(index, 1); // 1개의 항목을 제거
        });

        // 모델의 데이터 업데이트
        oDataModel.setProperty("/Items", aData);

        // 모델 새로고침
        oDataModel.refresh();
        
        // 선택 해제
        oTable.removeSelections(true);
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
            var properties = ['Plant', 'Operationid', 'OperationidText', 'Workcenter', 'WorkcenterText'];
        
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
            var supportMultiselect = true;
    
            // 특정 ID일 경우 다중 선택 비활성화
            if (sMultiInputId.includes("operationid") || sMultiInputId.includes("workcenter")) {
                supportMultiselect = false;
            }

            var oDialog = new ValueHelpDialog({
                title: sTitle,
                key: sKey,
                supportMultiselect,
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
            var aTokens = oEvent.getParameter("tokens");
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
                
                this._createValueHelpDialog("플랜트 조회", "Plant", aColumns, aItems, sMultiInputId);
                this.getPlantData();
            
            // 필터_공정코드
            } else if (sMultiInputId === this.byId("VHOpCode").getId() || sMultiInputId.includes("operationid")) {
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
                
                this._createValueHelpDialog("공정코드 조회", "OperationStandardTextCode", aColumns, aItems, sMultiInputId);
                this.getOpCodeData();

            // 필터_작업장
            } else if (sMultiInputId === this.byId("VHWC").getId() || sMultiInputId.includes("workcenter")) {
                console.log(sMultiInputId);
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

                this._createValueHelpDialog("작업장 조회", "WorkCenter", aColumns, aItems, sMultiInputId);

                this.getWCData();

            }
        },        

         // 공통 데이터 가져오기 함수
        commonData: function (sPath, sErrorMessage) {
        var oModel = this.getOwnerComponent().getModel();
        
        return this._getODataRead(oModel, sPath)
            .done(function (oData) {
                var oTable = this._oVHD.getTable();
                oTable.setModel(new JSONModel(oData));
                oTable.bindRows("/");
                this._oVHD.update();
            }.bind(this))
            .fail(function () {
                MessageBox.error(sErrorMessage);
            });
        },

        // 플랜트 데이터
        getPlantData: function () {
            this.commonData("/Plant", "플랜트 데이터를 가져오는 데 실패했습니다.");
        },

        // 공정코드 데이터
        getOpCodeData: function () {
            this.commonData("/Operationid", "공정코드 데이터를 가져오는 데 실패했습니다.");
        },

         // 작업장 데이터
         getWCData: function () {
            this.commonData("/Workcenter", "작업장 데이터를 가져오는 데 실패했습니다.");
        }
    });
});
