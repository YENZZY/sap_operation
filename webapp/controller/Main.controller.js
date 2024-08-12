sap.ui.define([
    'operation/controller/BaseController',
    'sap/ui/model/json/JSONModel',
    'sap/m/MessageBox',
    'sap/m/MessageToast',
    'sap/ui/comp/valuehelpdialog/ValueHelpDialog',
    "sap/ui/core/CustomData",
    'sap/ui/core/library',
    'sap/m/SearchField',
    'sap/m/MultiInput',
    'sap/ui/model/type/String',
    'sap/m/Token',
    'sap/ui/model/Filter',
    'sap/ui/model/FilterOperator',
    'sap/ui/export/library',
    'sap/m/ColumnListItem',
    'sap/m/Label',
    'sap/m/Column',
    'sap/ui/table/Column',
    'sap/m/Text',
    'sap/m/Input',
    'sap/m/library',
    'sap/m/SuggestionItem',
    'sap/ui/export/Spreadsheet',
    'sap/ui/core/Fragment',
    'sap/ui/core/library',
    'sap/ui/comp/smartvariants/PersonalizableInfo',
    'sap/m/p13n/Engine',
    'sap/m/p13n/SelectionController',
	'sap/m/p13n/SortController',
	'sap/m/p13n/GroupController',
	'sap/m/p13n/MetadataHelper',
    'sap/ui/model/Sorter',
    'sap/m/table/ColumnWidthController',
    'operation/js/xlsx',
    'operation/js/jszip'
], function (Controller,
     JSONModel,
     MessageBox, MessageToast, ValueHelpDialog, CustomData, coreLibrary, SearchField, MultiInput, TypeString, Token, Filter, FilterOperator, exportLibrary, ColumnListItem, Label, MColumn, UIColumn, Text, Input, library, SuggestionItem, Spreadsheet, Fragment, ValueState, PersonalizableInfo, Engine, SelectionController, SortController, GroupController, MetadataHelper, Sorter, ColumnWidthController) {
    "use strict";

    var EdmType = exportLibrary.EdmType;
    var ValueState = sap.ui.core.ValueState;
    var InputType = library.InputType;

    return Controller.extend("operation.controller.Main", {
        onInit: function () {
            this.getRouter().getRoute("Main").attachMatched(this._onRouteMatched, this);

            this.oSmartVariantManagement = this.byId("standardSVM");
           
            this.oFilterBar = this.byId("filterbar");

            // 기본값 설정(FILTER)
                this.setDefaultValues();

            // 이벤트 핸들러 연결
            this.oSmartVariantManagement.attachAfterSave(this.onAfterVariantSave, this);
           
            var oPersInfo = new PersonalizableInfo({
                type: "filterbar",
                keyName: "persistencyKey",
                control: this.oFilterBar
            });

            this.oSmartVariantManagement.addPersonalizableControl(oPersInfo);
            this.oSmartVariantManagement.initialise(function () {}, this.oFilterBar);
            this.oFilterBar.registerFetchData(this.fetchData.bind(this));
            this.oFilterBar.registerApplyData(this.applyData.bind(this));
            this.oFilterBar.registerGetFiltersWithValues(this.getFiltersWithValues.bind(this));

            // value help 
            this.initializeValueHelpInputs();
            
            // table standard (start)
            this._registerForP13n(); // 테이블을 개인화 엔진에 등록하는 것
        },

       // MultiInput 초기화 및 설정
       initializeValueHelpInputs: function() {
        var aMultiInputs = ["VHOpCode", "VHPlant", "VHWC"];
    
        aMultiInputs.forEach(function(sId) {
            var oMultiInput = this.byId(sId);
            if (oMultiInput) {
                oMultiInput.addValidator(this._onMultiInputValidate);
                oMultiInput.setTokens(this._getDefaultTokens());
                oMultiInput.attachBrowserEvent("focusout", this.onFilterVhFocusOut.bind(this));
                }
            }.bind(this));
        },    

        // filter standard 기본 값
        setDefaultValues: function () {
            this._getDefaultTokens().then(function (aDefaultTokens) {
                var oMultiInput = this.byId("VHPlant");
                oMultiInput.setTokens(aDefaultTokens);
            }.bind(this));
        },

        onAfterVariantSave: function (oEvent) {
            // 저장된 변형이 로드될 때 실행될 추가 로직
            this.setDefaultValues();
        },

        onAfterVariantLoad: function (oEvent) {
            var oMultiInput = this.byId("VHPlant");

            // 저장된 변형에서 플랜트 필터 토큰 값을 가져와서 설정
            var aTokens = oMultiInput.getTokens();
            if (aTokens.length === 0) {
                this.setDefaultValues();
            }
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
                commonModelData("/Workcenter", "wcModel"),
                commonModelData("/Plant","plantModel")
            
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
                    this.setModel(new JSONModel({ items: aGetData }), "dataModel");
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

        // 토큰 변경 시 * 활성화 (standard *)
        onTokenChange : function () {
            this.oSmartVariantManagement.currentVariantSetModified(true); 
        },
        
        //svm : standard 필터바
        fetchData: function () {
            var aData = this.oFilterBar.getAllFilterItems().reduce(function (aResult, oFilterItem) {
            var oControl = oFilterItem.getControl();
            var fieldData = [];

            fieldData = oControl.getTokens().map(function (oToken) {
                return oToken.getKey(); // 또는 oToken.getText()를 사용할 수 있음
            });

            aResult.push({
                groupName: oFilterItem.getGroupName(),
                fieldName: oFilterItem.getName(),
                fieldData: fieldData
            });
        
            return aResult;
            }, []);
        
            return aData;
        },

        applyData: function (aData) {
            aData.forEach(function (oDataObject) {
            var oControl = this.oFilterBar.determineControlByName(oDataObject.fieldName, oDataObject.groupName);
        
            if (oControl instanceof sap.m.MultiInput) {
                try {
                    // 기존 토큰 제거
                    oControl.removeAllTokens();
        
                    // fieldData가 배열이 아니면 빈 배열로 처리
                    var aFieldData = Array.isArray(oDataObject.fieldData) ? oDataObject.fieldData : [];
        
                    // 새 토큰 추가
                    aFieldData.forEach(function (sTokenKey) {
                        if (sTokenKey) { // 빈 문자열 또는 null 체크
                        oControl.addToken(new sap.m.Token({ key: sTokenKey, text: sTokenKey }));
                        }
                    });
                } catch (e) {
                    console.error("Error applying data to control:", oControl, e);
                }
            } else {
                console.warn("Control is not of type sap.m.MultiInput:", oControl);
            }
            }, this);
        },

        getFiltersWithValues: function () {
            var aFiltersWithValue = this.oFilterBar.getFilterGroupItems().reduce(function (aResult, oFilterGroupItem) {
            var oControl = oFilterGroupItem.getControl();
        
            if (oControl.getTokens().length > 0) {
                aResult.push(oFilterGroupItem);
            }
        
            return aResult;
            }, []);
        
            return aFiltersWithValue;
        },
        //  svm : standard (end)

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
                MessageBox.error("플랜트 값은 필수 선택입니다.");
                this.MultiInputs("VHPlant", true); //필터_플랜트
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
            var oMainModel = this.getOwnerComponent().getModel();
            var oDataModel = this.getModel("dataModel"); // 테이블 데이터
            var aData = oDataModel.getData().items;
            
            // 유효성 검사: 유효하지 않은 공정 코드가 있는지 확인
            var oOpiModel = this.getModel("opiModel").getData();
            var oWcModel = this.getModel("wcModel").getData();
        
            // 유효성 검사: 유효하지 않은 공정 코드 또는 작업장이 있는지 확인
            var invalid = aData.some(function (item) {
                var invalidOperation = !oOpiModel.some(function (opiItem) { // 공정코드
                    return opiItem.OperationStandardTextCode === item.Operationid;
                });
                var invalidWorkCenter = !oWcModel.some(function (wcItem) { // 작업장
                    return wcItem.WorkCenter === item.Workcenter;
                });
                return invalidOperation || invalidWorkCenter;
            });
        
            if (invalid) {
                MessageBox.error("유효하지 않은 공정 코드 또는 작업장이 있습니다.");
                return; // 유효성 검사 실패 시 저장 중단 (유효성 검사를 통과한 경우에만 데이터 저장)
            }

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
                            MessageBox.error("데이터 저장에 실패하였습니다.");
                        });
                    }.bind(this));
                    MessageBox.success("데이터 저장에 성공하였습니다.");
                    // 데이터 새로고침
                    this._getData();
                }.bind(this)).fail(function (oError) {
                    MessageBox.error("삭제 중 오류가 발생했습니다. 오류: " + oError.message);
                });
            }.bind(this));
        },        

        // 푸터 - 취소 버튼
        onCancel: function () {
            this._getData();
               // 입력 필드의 유효성 상태와 오류 메시지 초기화
             this.resetInput();
        },
        
        // 초기화 시 유효성 지우기
        resetInput: function () {
            // 현재 컨트롤러가 관리하는 뷰를 가져옴
            var oView = this.getView();
        
            // 뷰에서 모든 Input 필드를 찾음
            var inputs = oView.findAggregatedObjects(true, function (oControl) { // findAggregatedObjects 메소드를 사용하여 현재 뷰 내에 있는 모든 sap.m.Input 컨트롤을 찾기. 뷰와 그 하위 컨트롤들을 재귀적으로 검색하여 조건에 맞는 컨트롤들을 반환
                return oControl.isA("Input"); // oControl.isA("Input")는 각 컨트롤이 sap.m.Input 인스턴스인지 확인하는 조건
            });
        
            // 각 Input 필드의 유효성 상태를 리셋
            inputs.forEach(function (oInput) {
                oInput.setValueState(ValueState.None);
                oInput.setValueStateText("");
            });
        },

        // 테이블 Value Help 열기
        onTableVh: function(oEvent) {
            var oInput = oEvent.getSource(); // 현재 입력 필드
            var oView = this.getView();

            this.oCell = oInput; // 현재 셀
            this.oRow = this.oCell.getParent(); // 현재 행
            this.oTable = this.oRow.getParent(); // 현재 테이블

            // 공정 코드 입력 필드인 경우 Value Help 열기
            if (oInput.getId().includes("operationid")) {
                Fragment.load({
                    id: oView.getId() + "_" + jQuery.now(),
                    name: "operation.view.Fragments.OperationId",
                    controller: this
                }).then(function(oValueHelpDialog) {
                    oView.addDependent(oValueHelpDialog);
                    oValueHelpDialog.open();
                    // 다이얼로그 인스턴스를 저장
                    this._currentDialog = {
                        dialog: oValueHelpDialog,
                        modelName: "opiModel",
                        valueProperty: "OperationStandardTextCode",
                        textProperty: "OperationStandardTextCodeName",
                        tableText: "operationidtext"
                    };
                }.bind(this)).catch(function(oError) {
                    console.error("공정 코드 Value Help를 여는데 실패하였습니다.", oError);
                });
            }else if(oInput.getId().includes("workcenter")) {
                // 작업장 다이얼로그 열기
                Fragment.load({
                    id: oView.getId() + "_" + jQuery.now(),
                    name: "operation.view.Fragments.WorkCenter",
                    controller: this
                }).then(function(oValueHelpDialog) {
                    oView.addDependent(oValueHelpDialog);
                    oValueHelpDialog.open();
                    
                    // 다이얼로그 인스턴스를 저장
                    this._currentDialog = {
                        dialog: oValueHelpDialog,
                        modelName: "wcModel",
                        valueProperty: "WorkCenter",
                        textProperty: "WorkCenterText",
                        tableText: "workcentertext"
                    };
                }.bind(this)).catch(function(oError) {
                    console.error("작업장 Value Help를 여는데 실패하였습니다.", oError);
                });
            }
        },
        
        // 테이블 Value Help 닫기
        onTableVhClose: function (oEvent) {
            var oSelectedItem = oEvent.getParameter("selectedItem");
            if (oSelectedItem) {
                var sModelName = this._currentDialog.modelName;
                var sValueProperty = this._currentDialog.valueProperty;
                var sTextProperty = this._currentDialog.textProperty;
                var stableText = this._currentDialog.tableText;
                var sPath = oSelectedItem.getBindingContext(sModelName).getPath();
                var oSelectedData = this.getModel(sModelName).getProperty(sPath);
                var sValue = oSelectedData[sValueProperty];
                var sText = oSelectedData[sTextProperty];

                if (this.oCell && this.oRow) {
                    var cellIndex = this.oRow.indexOfCell(this.oCell);
                    var oTableCell = this.oRow.getCells()[cellIndex];
                    var oTextCell = this.oRow.getCells().find(function (item) {
                        var itemid = item.getId();
                        console.log("itemid",itemid);
                        return item instanceof Text && item.getId().includes(stableText);
                    });

                    if (oTableCell instanceof Input) {
                        oTableCell.setValue(sValue);
                        if (oTextCell) {
                            oTextCell.setText(sText);
                        }
                    }
                }
                // 데이터 모델 업데이트
                this.getModel("dataModel").updateBindings(true);
            }
            // 필터 초기화
            oEvent.getSource().getBinding("items").filter([]);

            // 저장된 셀과 행 초기화
            this.oRow = null;
            this.oCell = null;

            this._currentDialog = null; // 다이얼로그 정보 초기화
        },
        
        onTableVhLiveChange: function (oEvent) {
            var oInput = oEvent.getSource();
            var sValue = oInput.getValue();
            var oInputId = oInput.getId();
            
            var oSettings = this.getModelSettings(oInputId);
            var oTableRow = oInput.getParent();
            var oDataModel = this.getModel("dataModel");
        
            this.updateTableValueAndText(oSettings, sValue, oTableRow, oInput);
        
            // 데이터 모델 업데이트
            oDataModel.updateBindings(); // UI와 데이터 모델 동기화
        },
        
        onTableVhSelected: function (oEvent) {
            var oInput = oEvent.getSource();
            var oInputId = oInput.getId();
            var oSelectedItem = oEvent.getParameter("selectedItem");
            
            var oSettings = this.getModelSettings(oInputId);
            var oTableRow = oInput.getParent();
            var oDataModel = this.getModel("dataModel");
        
            if (oSelectedItem) {
                var sValue = oSelectedItem.getKey();
                this.updateTableValueAndText(oSettings, sValue, oTableRow, oInput);
            } else {
                oInput.setValueState(ValueState.None); // 상태 초기화
                oInput.setValueStateText(""); // 상태 텍스트 초기화
            }
        
            // 데이터 모델 업데이트
            oDataModel.updateBindings(); // UI와 데이터 모델 동기화
        },
        
        // 공정코드 및 작업장 model 데이터
        getModelSettings: function (sInputId) {
            if (sInputId.includes("operationid")) {
                return {
                    sModelName: "opiModel",
                    sValueProperty: "OperationStandardTextCode",
                    sTextProperty: "OperationStandardTextCodeName",
                    sTableText: "operationidtext"
                };
            } else if (sInputId.includes("workcenter")) {
                return {
                    sModelName: "wcModel",
                    sValueProperty: "WorkCenter",
                    sTextProperty: "WorkCenterText",
                    sTableText: "workcentertext"
                };
            }
        },
        
        // 해당 공정 코드 (작업장) 명으로 업데이트
        updateTableValueAndText: function (oSettings, sValue, oTableRow, oInput) {
            var oModel = this.getModel(oSettings.sModelName);
            var aData = oModel.getData();
            
            var cellIndex = oTableRow.indexOfCell(oInput);
            var oTableCell = oTableRow.getCells()[cellIndex];
            var oTextCell = oTableRow.getCells().find(function (item) {
                return item instanceof Text && item.getId().includes(oSettings.sTableText);
            });
        
            if (sValue === "") { // 빈 문자열인 경우
                oTableCell.setValue(""); // 값 초기화
                if (oTextCell) {
                    oTextCell.setText(""); // 텍스트 초기화
                }
                oInput.setValueState(ValueState.None); // 상태 초기화
                oInput.setValueStateText(""); // 상태 텍스트 초기화
            } else {
                var oMatch = aData.find(function (item) {
                    return item[oSettings.sValueProperty] === sValue;
                });
        
                if (oMatch) {
                    var sText = oMatch[oSettings.sTextProperty]; // 텍스트
                    oTableCell.setValue(sValue); // 값 업데이트
                    if (oTextCell) {
                        oTextCell.setText(sText); // 텍스트 업데이트
                    }
                    oInput.setValueState(ValueState.None); // 상태 초기화
                    oInput.setValueStateText(""); // 상태 텍스트 초기화
                } else {
                    if (oTextCell) {
                        oTextCell.setText(""); // 텍스트 초기화
                    }
                    oInput.setValueState(ValueState.Error); // 상태 오류
                    oInput.setValueStateText("유효하지 않은 값입니다."); // 오류 메시지
                }
            }
        },        

        // 테이블 Value Help 검색
        onTableVhSearch: function (oEvent) {
            var sValueProperty = this._currentDialog.valueProperty;
            var sValue = oEvent.getParameter("value");
            var oFilter = new Filter(sValueProperty, FilterOperator.Contains, sValue);
            oEvent.getSource().getBinding("items").filter([oFilter]); // 검색 필터 적용
        },
        // 테이블 vh 끝

        // 필터 valuehelp
        onFilterVh: function (oEvent) {
            // ValueHelpDialog의 ID에 따라 변수를 설정
            var sValueHelpId = oEvent.getSource().getId();
            var filterName, label, keys, modelName, columnLabels, inputId, filterPaths;
        
            console.log("svi", sValueHelpId);
        
            // ID에 따라 조건을 설정
            if (sValueHelpId.includes("VHPlant")) {
                filterName = "PlantFilter";
                label = "플랜트";
                keys = ["Plant"];
                modelName = "plantModel";
                columnLabels = ["플랜트"];
                inputId = "VHPlant";
                filterPaths = ["Plant"];
        
            } else if (sValueHelpId.includes("VHOpCode")) {
                filterName = "OperationIdFilter";
                label = "공정코드";
                keys = ["OperationStandardTextCode", "OperationStandardTextCodeName"];
                modelName = "opiModel";
                columnLabels = ["공정코드", "공정코드명"];
                inputId = "VHOpCode";
                filterPaths = ["OperationStandardTextCode", "OperationStandardTextCodeName"];

            } else if (sValueHelpId.includes("VHWC")) {
                filterName = "WorkCenterFilter";
                label = "작업장";
                keys = ["WorkCenterCategoryCode", "Plant", "WorkCenter", "WorkCenterText", "Language"];
                modelName = "wcModel";
                columnLabels = ["범주", "플랜트", "작업장", "작업장명", "언어"];
                inputId = "VHWC";
                filterPaths = ["WorkCenterCategoryCode", "Plant", "WorkCenter", "WorkCenterText", "Language"];

            }
        
            this.oSuggestion = new MultiInput();
            this.oSearchSuggestion = new SearchField();
        
            this.dialogSuggestion = this.loadFragment({
                name: `operation.view.Fragments.${filterName}`
            }).then(function (oDialogSuggestions) {
                var oFilterBar = oDialogSuggestions.getFilterBar();
        
                this.vhdSuggestions = oDialogSuggestions;
                this.getView().addDependent(oDialogSuggestions);

                // 필터링을 위한 Key 필드 설정
                oDialogSuggestions.setRangeKeyFields([{
                    label: label,
                    key: keys[0], // 기본 키 필드 설정
                    type: "string",
                    typeInstance: new TypeString({}, {
                        maxLength: 7
                    })
                }]);
        
                // FilterBar의 기본 검색 설정
                oFilterBar.setFilterBarExpanded(false);
                oFilterBar.setBasicSearch(this.oSearchSuggestion);
        
                // 기본 검색이 실행될 때 FilterBar 검색 트리거
                this.oSearchSuggestion.attachSearch(function () {
                    oFilterBar.search();
                });
        
                oDialogSuggestions.getTableAsync().then(function (oTable) {
                    oTable.setModel(this.getOwnerComponent().getModel(modelName));
        
                    // 데스크톱의 기본 테이블은 sap.ui.table.Table
                    if (oTable.bindRows) {
                        oTable.bindAggregation("rows", {
                            path: `${modelName}>/`,
                            events: {
                                dataReceived: function () {
                                    oDialogSuggestions.update();
                                }
                            }
                        });
        
                        if (filterName === "PlantFilter") {
                            var oColumn = new UIColumn({
                                label: new Label({ text: columnLabels[0] }),
                                template: new Text({ wrapping: false, text: `{${modelName}>${keys[0]}}` })
                            });
                            oColumn.data({ fieldName: keys[0] });
                            oTable.addColumn(oColumn);
        
                        } else if (filterName === "OperationIdFilter") {
                            var oColumnOperationid = new UIColumn({
                                label: new Label({ text: columnLabels[0] }),
                                template: new Text({ wrapping: false, text: `{${modelName}>${keys[0]}}` })
                            });
                            oColumnOperationid.data({ fieldName: keys[0] });
                            oTable.addColumn(oColumnOperationid);
        
                            var oColumnOperationidText = new UIColumn({
                                label: new Label({ text: columnLabels[1] }),
                                template: new Text({ wrapping: false, text: `{${modelName}>${keys[1]}}` })
                            });
                            oColumnOperationidText.data({ fieldName: keys[1] });
                            oTable.addColumn(oColumnOperationidText);
        
                        } else if (filterName === "WorkCenterFilter") {
                            var oColumnWorkCenterCategoryCode = new UIColumn({
                                label: new Label({ text: columnLabels[0] }),
                                template: new Text({ wrapping: false, text: `{${modelName}>${keys[0]}}` })
                            });
                            oColumnWorkCenterCategoryCode.data({ fieldName: keys[0] });
                            oTable.addColumn(oColumnWorkCenterCategoryCode);
        
                            var oColumnPlant = new UIColumn({
                                label: new Label({ text: columnLabels[1] }),
                                template: new Text({ wrapping: false, text: `{${modelName}>${keys[1]}}` })
                            });
                            oColumnPlant.data({ fieldName: keys[1] });
                            oTable.addColumn(oColumnPlant);
        
                            var oColumnWorkCenter = new UIColumn({
                                label: new Label({ text: columnLabels[2] }),
                                template: new Text({ wrapping: false, text: `{${modelName}>${keys[2]}}` })
                            });
                            oColumnWorkCenter.data({ fieldName: keys[2] });
                            oTable.addColumn(oColumnWorkCenter);
        
                            var oColumnWorkCenterText = new UIColumn({
                                label: new Label({ text: columnLabels[3] }),
                                template: new Text({ wrapping: false, text: `{${modelName}>${keys[3]}}` })
                            });
                            oColumnWorkCenterText.data({ fieldName: keys[3] });
                            oTable.addColumn(oColumnWorkCenterText);
        
                            var oColumnLanguage = new UIColumn({
                                label: new Label({ text: columnLabels[4] }),
                                template: new Text({ wrapping: false, text: `{${modelName}>${keys[4]}}` })
                            });
                            oColumnLanguage.data({ fieldName: keys[4] });
                            oTable.addColumn(oColumnLanguage);
                        }
        
                    }
        
                    // 모바일의 기본 테이블은 sap.m.Table
                    if (oTable.bindItems) {
                        var cells = keys.map(function (key, index) {
                            return new Label({ text: `{${modelName}>${key}}` });
                        });
        
                        oTable.bindAggregation("items", {
                            path: `${modelName}/`,
                            template: new ColumnListItem({
                                cells: cells
                            }),
                            events: {
                                dataReceived: function () {
                                    oDialogSuggestions.update();
                                }
                            }
                        });
        
                        columnLabels.forEach(function (label) {
                            oTable.addColumn(new MColumn({ header: new Label({ text: label }) }));
                        });
                    }
        
                    oDialogSuggestions.update();
                }.bind(this));
        
                if (this.byId(inputId)) {
                    this.oMultiInputSuggestion = this.byId(inputId);
                } else {
                    MessageBox.error(`MultiInput의 ID '${inputId}'를 찾을 수 없습니다.`);
                }
        
                if (this.oMultiInputSuggestion) {
                    oDialogSuggestions.setTokens(this.oMultiInputSuggestion.getTokens());
                }
                // 데이터 속성으로 filterPaths 전달
            oDialogSuggestions.data("filterPaths", filterPaths);
            console.log("filterpa",filterPaths);
                oDialogSuggestions.open();
            }.bind(this));
        },

        onFilterVhOk: function (oEvent) {
			var aTokens = oEvent.getParameter("tokens");
			this.oMultiInputSuggestion.setTokens(aTokens);
            this.oSmartVariantManagement.currentVariantSetModified(true); //standard *
			this.vhdSuggestions.close();
		},

		onFilterVhCancel: function () {
			this.vhdSuggestions.close();
		},        

        onFilterVhClose: function () {
			this.vhdSuggestions.destroy();
		},

        onFilterVhSearch: function (oEvent) {
            // 데이터 속성에서 filterPaths 가져오기
            var filterPaths = this.vhdSuggestions.data("filterPaths");
        
            // SearchField의 검색어와 선택된 필터들을 가져오기
            var sSearchQuery = this.oSearchSuggestion.getValue();
            var aSelectionSet = oEvent.getParameter("selectionSet");
            
            // 필터를 생성
            var aFilters = aSelectionSet ? aSelectionSet.reduce(function (aResult, oControl) {
                if (oControl.getValue()) {
                    aResult.push(new Filter({
                        path: oControl.getName(),
                        operator: FilterOperator.Contains,
                        value1: oControl.getValue()
                    }));
                }
                return aResult;
            }, []) : [];
        
            // 검색어를 기반으로 필터 추가
            if (sSearchQuery) {
                var searchFilters = filterPaths.map(function (path) {
                    return new Filter({
                        path: path,
                        operator: FilterOperator.Contains,
                        value1: sSearchQuery
                    });
                });
                aFilters.push(new Filter({
                    filters: searchFilters,
                    and: false
                }));
            }
        
            // 필터 적용
            var oVHD = this.vhdSuggestions;
            oVHD.getTableAsync().then(function (oTable) {
                if (oTable.bindRows) {
                    oTable.getBinding("rows").filter(new Filter({
                        filters: aFilters,
                        and: true
                    }));
                }
                if (oTable.bindItems) {
                    oTable.getBinding("items").filter(new Filter({
                        filters: aFilters,
                        and: true
                    }));
                }
                oVHD.update();
            });
        },        

        // suggestion 선택 
        onFilterVhSelected: function (oEvent) {
            var oMultiInput = oEvent.getSource();
            var oSelectedItem = oEvent.getParameter("selectedRow"); // 선택된 행 가져오기
            var sValueHelpId = oMultiInput.getId();
            console.log("svldld", sValueHelpId);
            var contextModel ,contextProperty; 
            if(sValueHelpId.includes("VHPlant")){
                contextModel = "plantModel";
                contextProperty = "Plant";

            } else if(sValueHelpId.includes("VHOpCode")){
                contextModel = "opiModel";
                contextProperty = "OperationStandardTextCode";

            } else if(sValueHelpId.includes("VHWC")){
                contextModel = "wcModel";
                contextProperty = "WorkCenter";

            }
            if (oSelectedItem) {
                var oContext = oSelectedItem.getBindingContext(contextModel);
                var sKey = oContext.getProperty(contextProperty); // 키 값 가져오기

                // 현재 MultiInput에 존재하는 토큰들을 가져오기
                var aExistingTokens = oMultiInput.getTokens();

                    // 중복된 토큰이 있는지 확인
                    var bTokenExists = aExistingTokens.some(function (oToken) {
                        return oToken.getKey() === sKey;
                    });

                    // 중복된 토큰이 없을 경우에만 새 토큰을 추가
                    if (!bTokenExists) {
                        oMultiInput.addToken(new Token({
                            key: sKey,
                            text: sKey
                        }));
                    } else {
                        // 중복된 토큰이 있는 경우, 사용자에게 메시지 표시 (선택 사항)
                        MessageToast.show("이미 추가된 토큰입니다.");
                    }

                    // 입력 값을 지우기 (선택 후 텍스트 박스를 비움)
                    oMultiInput.setValue("");
            }
        },

        // 포커스 아웃 이벤트 핸들러
        onFilterVhFocusOut: function (oEvent) {
            // jQuery 이벤트 객체로부터 ID 가져오기
            var sId = oEvent.target.id;
        
            // ID에 따라 적절한 MultiInput ID 선택
            var inputId;
            if (sId.includes("VHPlant")) {
                inputId = "VHPlant";
            } else if (sId.includes("VHOpCode")) {
                inputId = "VHOpCode";
            } else if (sId.includes("VHWC")) {
                inputId = "VHWC";
            }
        
            // 해당 ID의 MultiInput 인스턴스 가져오기
            var oMultiInput = this.byId(inputId);
            if(oMultiInput){
            // 텍스트 필드를 지우기
            oMultiInput.setValue("");
            }
        },        
        // value help 끝

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
            var odelTable = this.byId("dataTable");
            if (!odelTable) {
                MessageBox.error("테이블을 찾을 수가 없습니다.");
                return;
            }
        
            var oBinding = odelTable.getBinding("items");
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
                    var aItems = oDataModel.getProperty("/items") || [];

                    // 새로운 행을 맨 앞에 추가
                    aItems.unshift(oItem);

                    oDataModel.setProperty("/items", aItems);

                    // 바인딩 업데이트
                    oDataModel.updateBindings();
                    
                }.bind(this)
            ).fail(function () {
                MessageBox.error("플랜트 데이터를 불러오는데 실패했습니다.");
            });
        },

        // 데이터 삭제 버튼
        onDelete: function () {
            var odelTable = this.byId("dataTable");
            var aSelectedItems = odelTable.getSelectedItems(); // 선택된 항목을 가져오기
            var oDataModel = this.getModel("dataModel");
            var aData = oDataModel.getProperty("/items");

            if (aSelectedItems.length === 0) {
                MessageBox.error("선택한 항목이 없습니다.");
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
            oDataModel.setProperty("/items", aData);

            // 모델 새로고침
            oDataModel.refresh();
            
            // 선택 해제
            odelTable.removeSelections(true);

            // 성공 메시지 박스 표시
            MessageBox.success("선택하신 항목이 임시로 삭제되었습니다. 변경 사항을 저장하려면 저장 버튼을 눌러주세요.");
        },   
            
        // 엑셀 다운로드
        onDownload: function () {
            var oMainModel = this.getOwnerComponent().getModel();
            var oOpiModel = this.getView().getModel("opiModel"); // opiModel 가져오기
            var oWcModel = this.getView().getModel("wcModel"); // wcModel 가져오기
            var oSettings, oSheet;

            // 데이터베이스에서 데이터를 가져오기
            this._getODataRead(oMainModel, "/Operationcd").done(function(aData) {
                // opiModel 및 wcModel의 데이터를 가져오기
                var aOpiData = oOpiModel.getProperty("/");
                var aWcData = oWcModel.getProperty("/");

                // aData의 Operationid와 opiModel의 OperationStandardTextCode를 비교하여 OperationidText 설정
                aData.forEach(function(oItem) {
                    var oMatchedOpiItem = aOpiData.find(function(opiItem) {
                        return opiItem.OperationStandardTextCode === oItem.Operationid;
                    });
                    if (oMatchedOpiItem) {
                        oItem.OperationidText = oMatchedOpiItem.OperationStandardTextCodeName;
                    }

                    // aData의 Workcenter와 wcModel의 WorkCenter를 비교하여 WorkcenterText 설정
                    var oMatchedWcItem = aWcData.find(function(wcItem) {
                        return wcItem.WorkCenter === oItem.Workcenter;
                    });
                    if (oMatchedWcItem) {
                        oItem.WorkcenterText = oMatchedWcItem.WorkCenterText;
                    }
                });

                // 공정코드(Operationid) 및 작업장명(WorkcenterText)으로 정렬
                aData.sort(function(a, b) {
                    var codeA = a.Operationid || "";
                    var codeB = b.Operationid || "";
                    if (codeA === codeB) {
                        var textA = a.WorkcenterText || "";
                        var textB = b.WorkcenterText || "";
                        return textA.localeCompare(textB);
                    }
                    return codeA.localeCompare(codeB);
                });

                // 엑셀 컬럼 설정을 생성
                var aCols = this.createColumnConfig();
                
                if (aData.length > 0) {
                    // 데이터가 있는 경우, 데이터 소스를 설정
                    oSettings = {
                        workbook: {
                            columns: aCols,
                            hierarchyLevel: 'Level' // 계층 구조 레벨 설정
                        },
                        dataSource: aData, // 데이터 소스 설정
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
                        dataSource: [0], // 빈 데이터 배열
                        fileName: '다인정공_공정 기준 정보_템플릿.xlsx', // 다운로드 파일 이름 설정
                        worker: false // 워커 사용 여부 (테이블 안 보이게)
                    };
                }

                // 엑셀 파일을 생성하고 다운로드
                oSheet = new Spreadsheet(oSettings);
                oSheet.build().finally(function() {
                    oSheet.destroy();
                });
            }.bind(this)).fail(function(oError) {
                MessageBox.error("데이터를 가져오는 데 실패하였습니다. 오류 : " + oError.message);
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
                    var workbook = XLSX.read(data, { type: 'binary' });
        
                    workbook.SheetNames.forEach(function (sheetName) {
                        var excelData = XLSX.utils.sheet_to_row_object_array(workbook.Sheets[sheetName]);
                        console.log(excelData);
        
                        // Plant 값을 가져오기
                        this._getODataRead(oMainModel, "/Plant").done(function (aPlantData) {
                            var sPlant = aPlantData[0].Plant;
        
                            // 필드 값을 추출하고 Plant 값을 추가
                            var filteredData = excelData.map(function (row) {
                                return {
                                    Plant: sPlant, // Plant 값을 추가
                                    Operationid: row["공정코드"] || row["Operationid"],
                                    Workcenter: row["작업장"] || row["Workcenter"]
                                };
                            });
        
                            console.log("fd",filteredData);

                            // 공정코드와 작업장 모델 데이터를 가져오기
                            var opiModel = this.getModel("opiModel").getData();
                            var wcModel = this.getModel("wcModel").getData();
        
                            // 공정코드와 작업장 리스트를 생성
                            var validOperationIds = opiModel.map(function (item) { return item.OperationStandardTextCode; });
                            var validWorkcenters = wcModel.map(function (item) { return item.WorkCenter; });
        
                            // 공정코드와 작업장 모델 데이터를 필터링
                            var aFilteredData = filteredData.filter(function (item) {
                                return validOperationIds.includes(item.Operationid) && validWorkcenters.includes(item.Workcenter);
                            });
                            console.log("aF",aFilteredData);

                            // 유효성 검사 실패한 데이터가 있는지 확인
                            var invalidData = filteredData.filter(function (item) {
                                return !validOperationIds.includes(item.Operationid) || !validWorkcenters.includes(item.Workcenter);
                            });

                            if (invalidData.length > 0) {
                                // 유효성 검사 실패한 데이터가 있는 경우 오류 메시지 표시
                                var invalidMessages = invalidData.map(function (item) {
                                    return "공정코드 : " + item.Operationid + ", 작업장명 : " + item.Workcenter;
                                }).join("\n");
                                MessageBox.error("엑셀 파일에 잘못된 공정코드 또는 작업장이 포함되어 있습니다. 데이터 업로드를 중단합니다.\n \n 잘못된 항목 \n" + invalidMessages);
                                return;
                            }

                            //기존 데이터에 있는지 확인
                            var aFilterOpi = this.getModel("dataModel").getData().items.filter(function (item) {
                                return item.Operationid && item.Workcenter;
                            });
                            // 중복 확인을 위한 객체 생성
                            var duplicateData = {};
                            var saveData = [];

                            aFilteredData.forEach(function (item) {
                                var opiwcKey = item.Operationid + "_" + item.Workcenter;
        
                                if (!duplicateData[opiwcKey]) {
                                    duplicateData[opiwcKey] = true;
        
                                    // aFilterOpi에 존재하지 않는지 확인
                                    var existsInFilterOpi = aFilterOpi.some(function (filterItem) {
                                        return filterItem.Operationid === item.Operationid &&
                                               filterItem.Workcenter === item.Workcenter;
                                    });
                                    console.log("existsInFilterOpi", existsInFilterOpi);
                                    if (!existsInFilterOpi) {
                                        saveData.push({
                                            Operationid: item.Operationid,
                                            Workcenter: item.Workcenter,
                                            Plant: sPlant
                                        });
                                    }
                                }
                            });
                           
                            // 데이터 저장 요청
                            saveData.forEach(function (oData) {
                                this._getODataCreate(oMainModel, "/Operationcd", oData).fail(function () {
                                    MessageBox.error("엑셀 파일이 업로드 되지 않았습니다.");
                                });
                            }.bind(this));
                            MessageBox.success("엑셀 파일이 업로드 되었습니다.");
        
                            // 데이터 새로고침
                            this._getData();
                        }.bind(this)); // 'this' 컨텍스트를 유지
                    }.bind(this)); // 'this' 컨텍스트를 유지
                }.bind(this); // 'this' 컨텍스트를 유지
        
                reader.readAsBinaryString(file);
            }
        },

        // table standard (vm)
          // setting 버튼
          openPersoDialog: function(oEvt) {
            this._openPersoDialog(["Columns", "Sorter", "Groups"], oEvt.getSource());
        },

        _openPersoDialog: function(aPanels, oSource) {
            var oTable = this.byId("dataTable");

            Engine.getInstance().show(oTable, aPanels, {
                contentHeight: aPanels.length > 1 ? "50rem" : "35rem",
                contentWidth: aPanels.length > 1 ? "45rem" : "32rem",
                source: oSource || oTable
            });
        },
          // vm standard  개인화 엔진을 설정하고 테이블을 등록
        _registerForP13n: function() {
			const oTable = this.byId("dataTable");

			this.oMetadataHelper = new MetadataHelper([{
					key: "plant_col",   // id 값
					label: "플랜트",
					path: "dataModel>Plant"   //db
				},
				{
					key: "operationid_col",
					label: "공정코드",
					path: "dataModel>Operationid"
				},
				{
					key: "operationidText_col",
					label: "공정코드명",
					path: "dataModel>OperationidText"
				},
				{
					key: "workcenter_col",
					label: "작업장",
					path: "dataModel>Workcenter"
				},
                {
					key: "workcenterText_col",
					label: "작업장명",
					path: "dataModel>WorkcenterText"
				}
			]);
            console.log("this.omh",this.oMetadataHelper);
            Engine.getInstance().register(oTable, {
                helper: this.oMetadataHelper,
                controller: {
                    Columns: new SelectionController({
                        targetAggregation: "columns",
                        control: oTable
                    }),
                    Sorter: new SortController({
                        control: oTable
                    }),
                    Groups: new GroupController({
                        control: oTable
                    }),
                    ColumnWidth: new ColumnWidthController({
                        control: oTable
                    }),
                }
            });
            Engine.getInstance().attachStateChange(this.handleStateChange.bind(this));
            
        },

        _getKey: function(oControl) {
            return this.getView().getLocalId(oControl.getId());
        },

        // handleStateChange 함수는 개인화 상태가 변경될 때 호출, 변경된 상태를 반영하여 테이블을 업데이트
        handleStateChange: function(oEvt) {
            const oTable = this.byId("dataTable");
            const oState = oEvt.getParameter("state");
        
            if (!oState) {
                return;
            }
        
            // 상태에 따라 열을 업데이트
            this.updateColumns(oState);
        
            // 필터와 정렬기를 생성
            const aGroups = this.createGroups(oState);
            const aSorter = this.createSorters(oState, aGroups);
        
            // 새로운 셀 템플릿을 생성
            const aCells = oState.Columns.map(function(oColumnState) {
                const sPath = this.oMetadataHelper.getProperty(oColumnState.key).path;
        
                if (oColumnState.key === "operationid_col") {
                    return new Input({
                        id: "operationid" + jQuery.now(), // ID를 재생성
                        value: "{" + sPath + "}",
                        type: InputType.Text, 
                        showValueHelp: true,
                        valueHelpRequest: this.onTableVh.bind(this),
                        suggestionItemSelected: this.onTableVhSelected.bind(this),
                        showSuggestion: true,
                        suggestionItems: {
                            path: 'opiModel>/',
                            templateShareable: false,
                            template: new SuggestionItem({
                                text: "{opiModel>OperationStandardTextCode}",
                                key: "{opiModel>OperationStandardTextCode}"
                            })
                        },
                        liveChange: this.onTableVhLiveChange.bind(this)
                    });
                } else if (oColumnState.key === "workcenter_col") {
                    return new Input({
                        id: "workcenter" + jQuery.now(), // ID를 재생성
                        value: "{" + sPath + "}",
                        type: InputType.Text,
                        showValueHelp: true,
                        valueHelpRequest: this.onTableVh.bind(this),
                        suggestionItemSelected: this.onTableVhSelected.bind(this),
                        showSuggestion: true,
                        suggestionItems: {
                            path: 'wcModel>/',
                            templateShareable: false,
                            template: new SuggestionItem({
                                text: "{wcModel>WorkCenter}",
                                key: "{wcModel>WorkCenter}"
                            })
                        },
                        liveChange: this.onTableVhLiveChange.bind(this)
                    });
                } else if (oColumnState.key === "plant_col" || oColumnState.key === "operationidText_col" || oColumnState.key === "workcenterText_col"){
        
                    return new Text({
                        id: (oColumnState.key.split("_col")[0]).toLowerCase() + jQuery.now(),
                        text: "{" + sPath + "}"
                    });
                }
            }.bind(this));
        
            // 업데이트된 템플릿으로 테이블 항목을 다시 바인딩합니다.
            oTable.bindItems({
                templateShareable: false,
                path: 'dataModel>/items',
                sorter: aSorter.concat(aGroups),
                template: new ColumnListItem({
                    cells: aCells
                })
            });
        },          
        
         //createSorters 함수는 현재 상태를 기반으로 정렬 생성
        createSorters: function(oState, aExistingSorter) {
            const aSorter = aExistingSorter || [];
            oState.Sorter.forEach(function(oSorter) {
                const oExistingSorter = aSorter.find(function(oSort) {
                    return oSort.sPath === this.oMetadataHelper.getProperty(oSorter.key).path;
                }.bind(this));

                if (oExistingSorter) {
                    oExistingSorter.bDescending = !!oSorter.descending;
                } else {
                    aSorter.push(new Sorter(this.oMetadataHelper.getProperty(oSorter.key).path, oSorter.descending));
                }
            }.bind(this));

            oState.Sorter.forEach(function(oSorter) {
                const oCol = this.byId(oSorter.key);
                if (oSorter.sorted !== false) {
                    oCol.setSortIndicator(oSorter.descending ? coreLibrary.SortOrder.Descending : coreLibrary.SortOrder.Ascending);
                }
            }.bind(this));

            return aSorter;
        },

        // createGroups 함수는 현재 상태를 기반으로 그룹을 생성
        createGroups: function(oState) {
            const aGroupings = [];
            oState.Groups.forEach(function(oGroup) {
                aGroupings.push(new Sorter(this.oMetadataHelper.getProperty(oGroup.key).path, false, true));
            }.bind(this));

            oState.Groups.forEach(function(oSorter) {
                const oCol = this.byId(oSorter.key);
                oCol.data("grouped", true);
            }.bind(this));

            return aGroupings;
        },

        // updateColumns 함수는 현재 상태를 기반으로 열을 업데이트
        updateColumns: function(oState) {
            const oTable = this.byId("dataTable");
        
            oTable.getColumns().forEach(function(oColumn) {
                oColumn.setVisible(false);
                oColumn.setWidth(oState.ColumnWidth[this._getKey(oColumn)]);
                oColumn.setSortIndicator(coreLibrary.SortOrder.None);
                oColumn.data("grouped", false);
            }.bind(this));
        
            oState.Columns.forEach(function(oProp, iIndex) {
                const oCol = this.byId(oProp.key);
                if (oCol) {
                    oCol.setVisible(true);
                    oTable.removeColumn(oCol);
                    oTable.insertColumn(oCol, iIndex);
                }
            }.bind(this));
        },

        // beforeOpenColumnMenu 함수는 열 메뉴가 열리기 전에 호출되며, 메뉴 항목을 설정
        beforeOpenColumnMenu: function(oEvt) {
            const oMenu = this.byId("menu");
            const oColumn = oEvt.getParameter("openBy");
            const oSortItem = oMenu.getQuickActions()[0].getItems()[0];
            const oGroupItem = oMenu.getQuickActions()[1].getItems()[0];

            oSortItem.setKey(this._getKey(oColumn));
            oSortItem.setLabel(oColumn.getHeader().getText());
            oSortItem.setSortOrder(oColumn.getSortIndicator());

            oGroupItem.setKey(this._getKey(oColumn));
            oGroupItem.setLabel(oColumn.getHeader().getText());
            oGroupItem.setGrouped(oColumn.data("grouped"));
        },

        // 열 클릭 시 대화 상자 열기 (열 헤더 아이템을 클릭했을 때 적절한 개인화 대화 상자 열림)
        onColumnHeaderItemPress: function(oEvt) {
            const oColumnHeaderItem = oEvt.getSource();
            let sPanel = "Columns";
            if (oColumnHeaderItem.getIcon().indexOf("group") >= 0) {
                sPanel = "Groups";
            } else if (oColumnHeaderItem.getIcon().indexOf("sort") >= 0) {
                sPanel = "Sorter";
            } 

            this._openPersoDialog([sPanel]);
        },

        onSort: function(oEvt) {
            const oSortItem = oEvt.getParameter("item");
            const oTable = this.byId("dataTable");
            const sAffectedProperty = oSortItem.getKey();
            const sSortOrder = oSortItem.getSortOrder();

            //Apply the state programatically on sorting through the column menu
            //1) Retrieve the current personalization state
            Engine.getInstance().retrieveState(oTable).then(function(oState) {

                //2) Modify the existing personalization state --> clear all sorters before
                oState.Sorter.forEach(function(oSorter) {
                    oSorter.sorted = false;
                });

                if (sSortOrder !== coreLibrary.SortOrder.None) {
                    oState.Sorter.push({
                        key: sAffectedProperty,
                        descending: sSortOrder === coreLibrary.SortOrder.Descending
                    });
                }

                //3) Apply the modified personalization state to persist it in the VariantManagement
                Engine.getInstance().applyState(oTable, oState);
            });
        },

        // 그룹화
        onGroup: function(oEvt) {
            const oGroupItem = oEvt.getParameter("item");
            const oTable = this.byId("dataTable");
            const sAffectedProperty = oGroupItem.getKey();

            //1) Retrieve the current personalization state
            Engine.getInstance().retrieveState(oTable).then(function(oState) {

                //2) Modify the existing personalization state --> clear all groupings before
                oState.Groups.forEach(function(oSorter) {
                    oSorter.grouped = false;
                });

                if (oGroupItem.getGrouped()) {
                    oState.Groups.push({
                        key: sAffectedProperty
                    });
                }

                //3) Apply the modified personalization state to persist it in the VariantManagement
                Engine.getInstance().applyState(oTable, oState);
            });
        },

        // 열 이동 및 크기 조정
        onColumnMove: function(oEvt) {
            const oDraggedColumn = oEvt.getParameter("draggedControl");
            const oDroppedColumn = oEvt.getParameter("droppedControl");

            if (oDraggedColumn === oDroppedColumn) {
                return;
            }

            const oTable = this.byId("dataTable");
            const sDropPosition = oEvt.getParameter("dropPosition");
            const iDraggedIndex = oTable.indexOfColumn(oDraggedColumn);
            const iDroppedIndex = oTable.indexOfColumn(oDroppedColumn);
            const iNewPos = iDroppedIndex + (sDropPosition == "Before" ? 0 : 1) + (iDraggedIndex < iDroppedIndex ? -1 : 0);
            const sKey = this._getKey(oDraggedColumn);

            Engine.getInstance().retrieveState(oTable).then(function(oState) {

                const oCol = oState.Columns.find(function(oColumn) {
                    return oColumn.key === sKey;
                }) || {
                    key: sKey
                };
                oCol.position = iNewPos;

                Engine.getInstance().applyState(oTable, {
                    Columns: [oCol]
                });
            });
        },

        onColumnResize: function(oEvt) {
            const oColumn = oEvt.getParameter("column");
            const sWidth = oEvt.getParameter("width");
            const oTable = this.byId("dataTable");

            const oColumnState = {};
            oColumnState[this._getKey(oColumn)] = sWidth;

            Engine.getInstance().applyState(oTable, {
                ColumnWidth: oColumnState
            });
        }
    });
});
