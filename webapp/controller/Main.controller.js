sap.ui.define([
    'operation/controller/BaseController',
    'sap/ui/model/json/JSONModel',
    'sap/m/MessageBox',
    'sap/ui/comp/valuehelpdialog/ValueHelpDialog',
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
    'sap/ui/export/Spreadsheet',
    'sap/ui/core/Fragment',
    'sap/ui/core/library',
    'sap/ui/comp/smartvariants/PersonalizableInfo',
    'sap/m/p13n/Engine'
], function (Controller, JSONModel, MessageBox, ValueHelpDialog, coreLibrary, SearchField, MultiInput, TypeString, Token, Filter, FilterOperator, exportLibrary, ColumnListItem, Label, MColumn, UIColumn, Text, Spreadsheet, Fragment, ValueState, PersonalizableInfo, Engine, SelectionController, SortController, GroupController, FilterController, MetadataHelper, Sorter, ColumnWidthController) {
    "use strict";

    var EdmType = exportLibrary.EdmType;
    var ValueState = sap.ui.core.ValueState;

    return Controller.extend("operation.controller.Main", {
        onInit: function () {
            this.getRouter().getRoute("Main").attachMatched(this._onRouteMatched, this);

            this.oSmartVariantManagement = this.byId("standardSVM");
           
            this.oFilterBar = this.byId("filterbar");
            
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

            // value help 공정코드
            var oMultiInputWithSuggestions;

            // suggestions filter 공정코드 value help
			oMultiInputWithSuggestions = this.byId("VHOpCode"); // 공정코드
			oMultiInputWithSuggestions.addValidator(this._onMultiInputValidate);
			oMultiInputWithSuggestions.setTokens(this._getDefaultTokens());
			this._oMultiInputWithSuggestions = oMultiInputWithSuggestions;

            var oMultiInput = this.byId("VHOpCode");
            // 포커스 아웃 이벤트 핸들러 등록
            oMultiInput.attachBrowserEvent("focusout", this.onMultiInputFocusOut.bind(this));

            // 플랜트 value help
            var oPlantSuggestion;

			oPlantSuggestion = this.byId("VHPlant"); // 공정코드
			oPlantSuggestion.addValidator(this._onMultiInputValidate);
			oPlantSuggestion.setTokens(this._getDefaultTokens());
			this._oPlantSuggestion = oPlantSuggestion;

            var oPlantInput = this.byId("VHPlant");
            // 포커스 아웃 이벤트 핸들러 등록
            oPlantInput.attachBrowserEvent("focusout", this.onPlantFocusOut.bind(this));

            // 작업장 value help
            var oWCSuggestion;

			oWCSuggestion = this.byId("VHWC"); // 공정코드
			oWCSuggestion.addValidator(this._onMultiInputValidate);
			oWCSuggestion.setTokens(this._getDefaultTokens());
			this._oWCSuggestion = oWCSuggestion;

            var oWcInput = this.byId("VHWC");
            // 포커스 아웃 이벤트 핸들러 등록
            oWcInput.attachBrowserEvent("focusout", this.onWcFocusOut.bind(this));

            // table standard (start)
            //this._registerForP13n(); // 테이블을 개인화 엔진에 등록하는 것
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
                    this.setModel(new JSONModel({ Items: aGetData }), "dataModel");
                    // this.MultiInputs("VHWC"); // 필터_작업장
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

        // setting 버튼
        openPersoDialog: function(oEvt) {
            var oTable = this.byId("dataTable");

            Engine.getInstance().show(oTable, ["columns"], {
                contentHeight: "35rem",
                contentWidth: "32rem",
                source: oEvt.getSource()
            });
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
            var oMainModel = this.getOwnerComponent().getModel();
            var oDataModel = this.getModel("dataModel"); // 테이블 데이터
            var aData = oDataModel.getData().Items;
            
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
                return oControl.isA("sap.m.Input"); // oControl.isA("sap.m.Input")는 각 컨트롤이 sap.m.Input 인스턴스인지 확인하는 조건
            });
        
            // 각 Input 필드의 유효성 상태를 리셋
            inputs.forEach(function (oInput) {
                oInput.setValueState(ValueState.None);
                oInput.setValueStateText("");
            });
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
        // 공정코드 Input에 입력했을 때 자동으로 공정코드명 바뀜 
        onOpiLiveChange: function (oEvent) {
            var oInput = oEvent.getSource();
            var sOperationId = oInput.getValue(); 
            var rowId = oEvent.getSource().getParent().getBindingContext("dataModel").getPath().split("/").pop();
            this.inputRow = rowId;
            var oModel = this.getModel("opiModel");
            var aData = oModel.getData();

            var oMatch = aData.find(function (item) {
                return item.OperationStandardTextCode === sOperationId;
            });
        
            if (sOperationId === "") {
                // 값이 비어있을 때 처리
                oInput.setValueState(ValueState.None);
                oInput.setValueStateText("");
                return;
            }

            if (oMatch) {
                var sText = oMatch.OperationStandardTextCodeName;
                var oDataModel = this.getModel("dataModel");
                var items = oDataModel.getData().Items;
                items[this.inputRow].Operationid = sOperationId;
                items[this.inputRow].OperationidText = sText;
                
                oDataModel.updateBindings();
        
                oInput.setValueState(ValueState.None);
            } else {
                oInput.setValueState(ValueState.Error);
                oInput.setValueStateText("유효하지 않은 공정 코드명입니다.");
            }
        },
        // suggestion에서 공정코드 선택했을 시 공정코드명 자동 변환
        onOpiSelected: function (oEvent) {
            var oInput = oEvent.getSource();
            var oSelectedItem = oEvent.getParameter("selectedItem");
            var rowId = oEvent.getSource().getParent().getBindingContext("dataModel").getPath().split("/").pop();
            this.inputRow = rowId;
            var oModel = this.getModel("opiModel");
            var aData = oModel.getData();

            if (oSelectedItem) {
                var sOperationId = oSelectedItem.getKey(); // 공정 코드

                var oMatch = aData.find(function (item) {
                    return item.OperationStandardTextCode === sOperationId;
                });
                if (oMatch) {
                    var sText = oMatch.OperationStandardTextCodeName;
                    var oDataModel = this.getModel("dataModel");
                    var items = oDataModel.getData().Items;
                    items[this.inputRow].Operationid = sOperationId;
                    items[this.inputRow].OperationidText = sText;
                    
                    oDataModel.updateBindings();
            
                    oInput.setValueState(ValueState.None);
                    oInput.setValueStateText("");
                } else {
                    oInput.setValueState(ValueState.Error);
                    oInput.setValueStateText("유효하지 않은 공정 코드입니다.");
                }
            } else {
                // 선택된 항목이 없는 경우 입력 필드를 초기화
                oInput.setValueState(ValueState.None);
                oInput.setValueStateText("");
            }
        },

        handleValidation: function (oEvent) {
            var oInput = oEvent.getSource();
            var sValue = oInput.getValue(); // Input 입력 값
            var oModel = this.getModel("opiModel");
            var aData = oModel.getData();

            var bValid = aData.some(function (item) {
                return item.OperationStandardTextCode === sValue; // 공정코드
            });

            if (bValid) {
                oInput.setValueState(ValueState.None);
            } else {
                oInput.setValueState(ValueState.Error);
                oInput.setValueStateText("유효하지 않은 공정 코드입니다.");
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

         // 작업장 Input에 입력했을 때 자동으로 작업장명 바뀜 
         onWcLiveChange: function (oEvent) {
            var oInput = oEvent.getSource();
            var sWorkcenter = oInput.getValue(); 
            var rowId = oEvent.getSource().getParent().getBindingContext("dataModel").getPath().split("/").pop();
            this.inputRow = rowId;
            var oModel = this.getModel("wcModel");
            var aData = oModel.getData();

            var oMatch = aData.find(function (item) {
                return item.WorkCenter === sWorkcenter;
            });
        
            if (sWorkcenter === "") {
                // 값이 비어있을 때 처리
                oInput.setValueState(ValueState.None);
                oInput.setValueStateText("");
                return;
            }

            if (oMatch) {
                var sText = oMatch.WorkCenter;
                var oDataModel = this.getModel("dataModel");
                var items = oDataModel.getData().Items;
                items[this.inputRow].Workcenter = sWorkcenter;
                items[this.inputRow].WorkcenterText = sText;
                
                oDataModel.updateBindings();
        
                oInput.setValueState(ValueState.None);
            } else {
                oInput.setValueState(ValueState.Error);
                oInput.setValueStateText("유효하지 않은 작업장입니다.");
            }
        },
        

        // 작업장 suggestion에서 선택했을 시 작업장명 자동 변환
        onWcSelected: function (oEvent) {
            var oInput = oEvent.getSource();
            var oSelectedItem = oEvent.getParameter("selectedItem");
            var rowId = oEvent.getSource().getParent().getBindingContext("dataModel").getPath().split("/").pop();
            this.inputRow = rowId;
            var oModel = this.getModel("wcModel");
            var aData = oModel.getData();

            if (oSelectedItem) {
                var sWorkcenter = oSelectedItem.getKey(); // 작업장

                var oMatch = aData.find(function (item) {
                    return item.WorkCenter === sWorkcenter;
                });
                if (oMatch) {
                    var sText = oMatch.WorkCenterText;
                    var oDataModel = this.getModel("dataModel");
                    var items = oDataModel.getData().Items;
                    items[this.inputRow].Workcenter = sWorkcenter;
                    items[this.inputRow].WorkcenterText = sText;
                    
                    oDataModel.updateBindings();
            
                    oInput.setValueState(ValueState.None);
                    oInput.setValueStateText("");
                } else {
                    oInput.setValueState(ValueState.Error);
                    oInput.setValueStateText("유효하지 않은 작업장입니다.");
                }
            } else {
                // 선택된 항목이 없는 경우 입력 필드를 초기화
                oInput.setValueState(ValueState.None);
                oInput.setValueStateText("");
            }
        },

        // suggestion validation
        wchandleValidation: function (oEvent) {
            var oInput = oEvent.getSource();
            var sValue = oInput.getValue(); // Input 입력 값
            var oModel = this.getModel("wcModel");
            var aData = oModel.getData();

            var bValid = aData.some(function (item) {
                return item.WorkCenter === sValue; // 작업장
            });

            if (bValid) {
                oInput.setValueState(ValueState.None);
            } else {
                oInput.setValueState(ValueState.Error);
                oInput.setValueStateText("유효하지 않은 작업장입니다.");
            }
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

        // value help 시작
        onValueHelps: function () {
            // 초기화된 MultiInput 객체
            this._oMultiInputWithSuggestions = new MultiInput();

            this._oBasicSearchFieldWithSuggestions = new SearchField();

            this.pDialogWithSuggestions = this.loadFragment({
                name: "operation.view.Fragments.OperationIdFilter"
            }).then(function (oDialogSuggestions) {
                var oFilterBar = oDialogSuggestions.getFilterBar(),
                    oColumnOperationid, oColumnOperationidText;
                this._oVHDWithSuggestions = oDialogSuggestions;

                this.getView().addDependent(oDialogSuggestions);

                // 필터링을 위한 Key 필드 설정
                oDialogSuggestions.setRangeKeyFields([{
                    label: "공정코드",
                    key: "OperationStandardTextCode",
                    type: "string",
                    typeInstance: new TypeString({}, {
                        maxLength: 7
                    })
                }]);

                // FilterBar의 기본 검색 설정
                oFilterBar.setFilterBarExpanded(false);
                oFilterBar.setBasicSearch(this._oBasicSearchFieldWithSuggestions);

                // 기본 검색이 실행될 때 필터바 검색 트리거
                this._oBasicSearchFieldWithSuggestions.attachSearch(function () {
                    oFilterBar.search();
                });

                oDialogSuggestions.getTableAsync().then(function (oTable) {
                    oTable.setModel(this.getOwnerComponent().getModel("opiModel"));

                    // 데스크톱의 기본 테이블은 sap.ui.table.Table
                    if (oTable.bindRows) {
                        oTable.bindAggregation("rows", {
                            path: "opiModel>/",
                            events: {
                                dataReceived: function () {
                                    oDialogSuggestions.update();
                                }
                            }
                        });
                        oColumnOperationid = new UIColumn({
                            label: new Label({ text: "공정코드" }),
                            template: new Text({ wrapping: false, text: "{opiModel>OperationStandardTextCode}" })
                        });
                        oColumnOperationid.data({ fieldName: "OperationStandardTextCode" });
                        oTable.addColumn(oColumnOperationid);

                        oColumnOperationidText = new UIColumn({
                            label: new Label({ text: "공정코드명" }),
                            template: new Text({ wrapping: false, text: "{opiModel>OperationStandardTextCodeName}" })
                        });
                        oColumnOperationidText.data({ fieldName: "OperationStandardTextCodeName" });
                        oTable.addColumn(oColumnOperationidText);
                    }

                    // 모바일의 기본 테이블은 sap.m.Table
                    if (oTable.bindItems) {
                        oTable.bindAggregation("items", {
                            path: "opiModel>/",
                            template: new ColumnListItem({
                                cells: [
                                    new Label({ text: "{opiModel>OperationStandardTextCode}" }),
                                    new Label({ text: "{opiModel>OperationStandardTextCodeName}" })
                                ]
                            }),
                            events: {
                                dataReceived: function () {
                                    oDialogSuggestions.update();
                                }
                            }
                        });
                        oTable.addColumn(new MColumn({ header: new Label({ text: "공정코드" }) }));
                        oTable.addColumn(new MColumn({ header: new Label({ text: "공정코드명" }) }));
                    }
                    oDialogSuggestions.update();
                }.bind(this));

                if (this.byId("VHOpCode")) {
                    this._oMultiInputWithSuggestions = this.byId("VHOpCode");
                } else {
                    MessageBox.error("MultiInput의 ID 'VHOpCode'를 찾을 수 없습니다.");
                }

                // _oMultiInputWithSuggestions가 올바르게 초기화된 경우에만 setTokens 호출
                if (this._oMultiInputWithSuggestions) {
                    oDialogSuggestions.setTokens(this._oMultiInputWithSuggestions.getTokens());
                }

                oDialogSuggestions.open();
            }.bind(this));
        },
        
		onValueHelpWithSuggestionsOkPress: function (oEvent) {
			var aTokens = oEvent.getParameter("tokens");
			this._oMultiInputWithSuggestions.setTokens(aTokens);
			this._oVHDWithSuggestions.close();
		},
		onValueHelpWithSuggestionsCancelPress: function () {
			this._oVHDWithSuggestions.close();
		},
		onFilterBarWithSuggestionsSearch: function (oEvent) {
			var sSearchQuery = this._oBasicSearchFieldWithSuggestions.getValue(),
				aSelectionSet = oEvent.getParameter("selectionSet"),
				aFilters = aSelectionSet && aSelectionSet.reduce(function (aResult, oControl) {
				if (oControl.getValue()) {
					aResult.push(new Filter({
						path: oControl.getName(),
						operator: FilterOperator.Contains,
						value1: oControl.getValue()
					}));
				}

				return aResult;
			}, []);

			aFilters.push(new Filter({
				filters: [
					new Filter({ path: "OperationStandardTextCode", operator: FilterOperator.Contains, value1: sSearchQuery }),
					new Filter({ path: "OperationStandardTextCodeText", operator: FilterOperator.Contains, value1: sSearchQuery })
				],
				and: false
			}));

			this._filterTableWithSuggestions(new Filter({
				filters: aFilters,
				and: true
			}));
		},
		_filterTableWithSuggestions: function (oFilter) {
			var oVHD = this._oVHDWithSuggestions;
			oVHD.getTableAsync().then(function (oTable) {
				if (oTable.bindRows) {
					oTable.getBinding("rows").filter(oFilter);
				}
				if (oTable.bindItems) {
					oTable.getBinding("items").filter(oFilter);
				}
				oVHD.update();
			});
		},
		onValueHelpWithSuggestionsAfterClose: function () {
			this._oVHDWithSuggestions.destroy();
		},

        onSuggestionItemSelected: function (oEvent) {
            var oMultiInput = oEvent.getSource();
            var oSelectedItem = oEvent.getParameter("selectedRow"); // 선택된 행 가져오기

            if (oSelectedItem) {
                var oContext = oSelectedItem.getBindingContext("opiModel");
                var sKey = oContext.getProperty("OperationStandardTextCode"); // 키 값 가져오기

                // 키 값을 토큰으로 추가
                oMultiInput.addToken(new Token({
                    key: sKey,
                    text: sKey
                }));

                // 입력 값을 지우기 (선택 후 텍스트 박스를 비움)
                oMultiInput.setValue("");
            }
        },
        onMultiInputFocusOut: function (oEvent) {
            var oMultiInput = this.byId("VHOpCode");
            
            // 텍스트 필드를 지우기
            oMultiInput.setValue("");
        },
                // value help 끝

        // 플랜트
        onPlantValueHelp: function () {
            // 초기화된 MultiInput 객체
            this._oPlantSuggestion = new MultiInput();

            this._oBasicSearchFieldWithSuggestions = new SearchField();

            this.pDialogWithSuggestions = this.loadFragment({
                name: "operation.view.Fragments.PlantFilter"
            }).then(function (oDialogSuggestions) {
                var oFilterBar = oDialogSuggestions.getFilterBar(),
                    oColumnPlant;
                this._oVHDWithSuggestions = oDialogSuggestions;

                this.getView().addDependent(oDialogSuggestions);

                // 필터링을 위한 Key 필드 설정
                oDialogSuggestions.setRangeKeyFields([{
                    label: "플랜트",
                    key: "Plant",
                    type: "string",
                    typeInstance: new TypeString({}, {
                        maxLength: 7
                    })
                }]);

                // FilterBar의 기본 검색 설정
                oFilterBar.setFilterBarExpanded(false);
                oFilterBar.setBasicSearch(this._oBasicSearchFieldWithSuggestions);

                // 기본 검색이 실행될 때 필터바 검색 트리거
                this._oBasicSearchFieldWithSuggestions.attachSearch(function () {
                    oFilterBar.search();
                });

                oDialogSuggestions.getTableAsync().then(function (oTable) {
                    oTable.setModel(this.getOwnerComponent().getModel("plantModel"));

                    // 데스크톱의 기본 테이블은 sap.ui.table.Table
                    if (oTable.bindRows) {
                        oTable.bindAggregation("rows", {
                            path: "plantModel>/",
                            events: {
                                dataReceived: function () {
                                    oDialogSuggestions.update();
                                }
                            }
                        });
                        oColumnPlant = new UIColumn({
                            label: new Label({ text: "플랜트" }),
                            template: new Text({ wrapping: false, text: "{plantModel>Plant}" })
                        });
                        oColumnPlant.data({ fieldName: "Plant" });
                        oTable.addColumn(oColumnPlant);

                    }

                    // 모바일의 기본 테이블은 sap.m.Table
                    if (oTable.bindItems) {
                        oTable.bindAggregation("items", {
                            path: "plantModel>/",
                            template: new ColumnListItem({
                                cells: [
                                    new Label({ text: "{plantModel>Plant}" }),
                                ]
                            }),
                            events: {
                                dataReceived: function () {
                                    oDialogSuggestions.update();
                                }
                            }
                        });
                        oTable.addColumn(new MColumn({ header: new Label({ text: "플랜트" }) }));
                    }
                    oDialogSuggestions.update();
                }.bind(this));

                if (this.byId("VHPlant")) {
                    this._oMultiInputWithSuggestions = this.byId("VHPlant");
                } else {
                    MessageBox.error("MultiInput의 ID 'VHPlant'를 찾을 수 없습니다.");
                }

                // _oMultiInputWithSuggestions가 올바르게 초기화된 경우에만 setTokens 호출
                if (this._oMultiInputWithSuggestions) {
                    oDialogSuggestions.setTokens(this._oMultiInputWithSuggestions.getTokens());
                }

                oDialogSuggestions.open();
            }.bind(this));
        },
        onPlantOk: function (oEvent) {
			var aTokens = oEvent.getParameter("tokens");
			this._oMultiInputWithSuggestions.setTokens(aTokens);
			this._oVHDWithSuggestions.close();
		},
		onPlantCancel: function () {
			this._oVHDWithSuggestions.close();
		},
		onPlantSearch: function (oEvent) {
			var sSearchQuery = this._oBasicSearchFieldWithSuggestions.getValue(),
				aSelectionSet = oEvent.getParameter("selectionSet"),
				aFilters = aSelectionSet && aSelectionSet.reduce(function (aResult, oControl) {
				if (oControl.getValue()) {
					aResult.push(new Filter({
						path: oControl.getName(),
						operator: FilterOperator.Contains,
						value1: oControl.getValue()
					}));
				}

				return aResult;
			}, []);

			aFilters.push(new Filter({
				filters: [
					new Filter({ path: "Plant", operator: FilterOperator.Contains, value1: sSearchQuery }),
				],
				and: false
			}));

			this._filterTableWithSuggestions(new Filter({
				filters: aFilters,
				and: true
			}));
		},
		_filterTableWithSuggestions: function (oFilter) {
			var oVHD = this._oVHDWithSuggestions;
			oVHD.getTableAsync().then(function (oTable) {
				if (oTable.bindRows) {
					oTable.getBinding("rows").filter(oFilter);
				}
				if (oTable.bindItems) {
					oTable.getBinding("items").filter(oFilter);
				}
				oVHD.update();
			});
		},
		onPlantClose: function () {
			this._oVHDWithSuggestions.destroy();
		},

        onPlantSelected: function (oEvent) {
            var oMultiInput = oEvent.getSource();
            var oSelectedItem = oEvent.getParameter("selectedRow"); // 선택된 행 가져오기

            if (oSelectedItem) {
                var oContext = oSelectedItem.getBindingContext("plantModel");
                var sKey = oContext.getProperty("Plant"); // 키 값 가져오기

                // 키 값을 토큰으로 추가
                oMultiInput.addToken(new Token({
                    key: sKey,
                    text: sKey
                }));

                // 입력 값을 지우기 (선택 후 텍스트 박스를 비움)
                oMultiInput.setValue("");
            }
        },
        onPlantFocusOut: function (oEvent) {
            var oMultiInput = this.byId("VHPlant");
            
            // 텍스트 필드를 지우기
            oMultiInput.setValue("");
        },
        // 플랜트 끝

        onWcValueHelps: function () {
            // 초기화된 MultiInput 객체
            this._oWCSuggestion = new MultiInput();

            this._oBasicSearchFieldWithSuggestions = new SearchField();

            this.pDialogWithSuggestions = this.loadFragment({
                name: "operation.view.Fragments.WorkCenterFilter"
            }).then(function (oDialogSuggestions) {
                var oFilterBar = oDialogSuggestions.getFilterBar(),
                oColumnWorkCenterCategoryCode, oColumnPlant, oColumnWorkCenter, oColumnWorkCenterText, oColumnLanguage;
                this._oVHDWithSuggestions = oDialogSuggestions;

                this.getView().addDependent(oDialogSuggestions);

                // 필터링을 위한 Key 필드 설정
                oDialogSuggestions.setRangeKeyFields([{
                    label: "작업장",
                    key: "WorkCenter",
                    type: "string",
                    typeInstance: new TypeString({}, {
                        maxLength: 7
                    })
                }]);

                // FilterBar의 기본 검색 설정
                oFilterBar.setFilterBarExpanded(false);
                oFilterBar.setBasicSearch(this._oBasicSearchFieldWithSuggestions);

                // 기본 검색이 실행될 때 필터바 검색 트리거
                this._oBasicSearchFieldWithSuggestions.attachSearch(function () {
                    oFilterBar.search();
                });

                oDialogSuggestions.getTableAsync().then(function (oTable) {
                    oTable.setModel(this.getOwnerComponent().getModel("wcModel"));

                    // 데스크톱의 기본 테이블은 sap.ui.table.Table
                    if (oTable.bindRows) {
                        oTable.bindAggregation("rows", {
                            path: "wcModel>/",
                            events: {
                                dataReceived: function () {
                                    oDialogSuggestions.update();
                                }
                            }
                        });
                        oColumnWorkCenterCategoryCode = new UIColumn({
                            label: new Label({ text: "범주" }),
                            template: new Text({ wrapping: false, text: "{wcModel>WorkCenterCategoryCode}" })
                        });
                        oColumnWorkCenterCategoryCode.data({ fieldName: "WorkCenterCategoryCode" });
                        oTable.addColumn(oColumnWorkCenterCategoryCode);

                        oColumnPlant = new UIColumn({
                            label: new Label({ text: "플랜트" }),
                            template: new Text({ wrapping: false, text: "{wcModel>Plant}" })
                        });
                        oColumnPlant.data({ fieldName: "Plant" });
                        oTable.addColumn(oColumnPlant);

                        oColumnWorkCenter = new UIColumn({
                            label: new Label({ text: "작업장" }),
                            template: new Text({ wrapping: false, text: "{wcModel>WorkCenter}" })
                        });
                        oColumnWorkCenter.data({ fieldName: "WorkCenter" });
                        oTable.addColumn(oColumnWorkCenter);

                        oColumnWorkCenterText = new UIColumn({
                            label: new Label({ text: "작업장명" }),
                            template: new Text({ wrapping: false, text: "{wcModel>WorkCenterText}" })
                        });
                        oColumnWorkCenterText.data({ fieldName: "WorkCenterText" });
                        oTable.addColumn(oColumnWorkCenterText);

                        oColumnLanguage = new UIColumn({
                            label: new Label({ text: "언어" }),
                            template: new Text({ wrapping: false, text: "{wcModel>Language}" })
                        });
                        oColumnLanguage.data({ fieldName: "Language" });
                        oTable.addColumn(oColumnLanguage);
                    }

                    // 모바일의 기본 테이블은 sap.m.Table
                    if (oTable.bindItems) {
                        oTable.bindAggregation("items", {
                            path: "wcModel>/",
                            template: new ColumnListItem({
                                cells: [
                                    new Label({ text: "{wcModel>WorkCenterCategoryCode}" }),
                                    new Label({ text: "{wcModel>Plant}" }),
                                    new Label({ text: "{wcModel>WorkCenter}" }),
                                    new Label({ text: "{wcModel>WorkCenterText}" }),
                                    new Label({ text: "{wcModel>Language}" }),
                                ]
                            }),
                            events: {
                                dataReceived: function () {
                                    oDialogSuggestions.update();
                                }
                            }
                        });
                        oTable.addColumn(new MColumn({ header: new Label({ text: "범주" }) }));
                        oTable.addColumn(new MColumn({ header: new Label({ text: "플랜트" }) }));
                        oTable.addColumn(new MColumn({ header: new Label({ text: "작업장" }) }));
                        oTable.addColumn(new MColumn({ header: new Label({ text: "작업장명" }) }));
                        oTable.addColumn(new MColumn({ header: new Label({ text: "언어" }) }));
                    }
                    oDialogSuggestions.update();
                }.bind(this));

                if (this.byId("VHWC")) {
                    this._oMultiInputWithSuggestions = this.byId("VHWC");
                } else {
                    MessageBox.error("MultiInput의 ID 'VHWC'를 찾을 수 없습니다.");
                }

                // _oMultiInputWithSuggestions가 올바르게 초기화된 경우에만 setTokens 호출
                if (this._oMultiInputWithSuggestions) {
                    oDialogSuggestions.setTokens(this._oMultiInputWithSuggestions.getTokens());
                }

                oDialogSuggestions.open();
            }.bind(this));
        },
        
		onWcOk: function (oEvent) {
			var aTokens = oEvent.getParameter("tokens");
			this._oMultiInputWithSuggestions.setTokens(aTokens);
			this._oVHDWithSuggestions.close();
		},
		onWcCancel: function () {
			this._oVHDWithSuggestions.close();
		},
		onWcSearch: function (oEvent) {
			var sSearchQuery = this._oBasicSearchFieldWithSuggestions.getValue(),
				aSelectionSet = oEvent.getParameter("selectionSet"),
				aFilters = aSelectionSet && aSelectionSet.reduce(function (aResult, oControl) {
				if (oControl.getValue()) {
					aResult.push(new Filter({
						path: oControl.getName(),
						operator: FilterOperator.Contains,
						value1: oControl.getValue()
					}));
				}

				return aResult;
			}, []);

			aFilters.push(new Filter({
				filters: [
					new Filter({ path: "WorkCenterCategoryCode", operator: FilterOperator.Contains, value1: sSearchQuery }),
					new Filter({ path: "Plant", operator: FilterOperator.Contains, value1: sSearchQuery }),
                    new Filter({ path: "WorkCenter", operator: FilterOperator.Contains, value1: sSearchQuery }),
					new Filter({ path: "WorkCenterText", operator: FilterOperator.Contains, value1: sSearchQuery }),
                    new Filter({ path: "Language", operator: FilterOperator.Contains, value1: sSearchQuery })
				],
				and: false
			}));

			this._filterTableWithSuggestions(new Filter({
				filters: aFilters,
				and: true
			}));
		},
		_filterTableWithSuggestions: function (oFilter) {
			var oVHD = this._oVHDWithSuggestions;
			oVHD.getTableAsync().then(function (oTable) {
				if (oTable.bindRows) {
					oTable.getBinding("rows").filter(oFilter);
				}
				if (oTable.bindItems) {
					oTable.getBinding("items").filter(oFilter);
				}
				oVHD.update();
			});
		},
		onWcClose: function () {
			this._oVHDWithSuggestions.destroy();
		},

        onWcSelected: function (oEvent) {
            var oMultiInput = oEvent.getSource();
            var oSelectedItem = oEvent.getParameter("selectedRow"); // 선택된 행 가져오기

            if (oSelectedItem) {
                var oContext = oSelectedItem.getBindingContext("wcModel");
                var sKey = oContext.getProperty("WorkCenter"); // 키 값 가져오기

                // 키 값을 토큰으로 추가
                oMultiInput.addToken(new Token({
                    key: sKey,
                    text: sKey
                }));

                // 입력 값을 지우기 (선택 후 텍스트 박스를 비움)
                oMultiInput.setValue("");
            }
        },
        onWcFocusOut: function (oEvent) {
            var oMultiInput = this.byId("VHWC");
            
            // 텍스트 필드를 지우기
            oMultiInput.setValue("");
        },
                // value help 끝

        // 플랜트
        onPlantValueHelp: function () {
            // 초기화된 MultiInput 객체
            this._oPlantSuggestion = new MultiInput();

            this._oBasicSearchFieldWithSuggestions = new SearchField();

            this.pDialogWithSuggestions = this.loadFragment({
                name: "operation.view.Fragments.PlantFilter"
            }).then(function (oDialogSuggestions) {
                var oFilterBar = oDialogSuggestions.getFilterBar(),
                    oColumnPlant;
                this._oVHDWithSuggestions = oDialogSuggestions;

                this.getView().addDependent(oDialogSuggestions);

                // 필터링을 위한 Key 필드 설정
                oDialogSuggestions.setRangeKeyFields([{
                    label: "플랜트",
                    key: "Plant",
                    type: "string",
                    typeInstance: new TypeString({}, {
                        maxLength: 7
                    })
                }]);

                // FilterBar의 기본 검색 설정
                oFilterBar.setFilterBarExpanded(false);
                oFilterBar.setBasicSearch(this._oBasicSearchFieldWithSuggestions);

                // 기본 검색이 실행될 때 필터바 검색 트리거
                this._oBasicSearchFieldWithSuggestions.attachSearch(function () {
                    oFilterBar.search();
                });

                oDialogSuggestions.getTableAsync().then(function (oTable) {
                    oTable.setModel(this.getOwnerComponent().getModel("plantModel"));

                    // 데스크톱의 기본 테이블은 sap.ui.table.Table
                    if (oTable.bindRows) {
                        oTable.bindAggregation("rows", {
                            path: "plantModel>/",
                            events: {
                                dataReceived: function () {
                                    oDialogSuggestions.update();
                                }
                            }
                        });
                        oColumnPlant = new UIColumn({
                            label: new Label({ text: "플랜트" }),
                            template: new Text({ wrapping: false, text: "{plantModel>Plant}" })
                        });
                        oColumnPlant.data({ fieldName: "Plant" });
                        oTable.addColumn(oColumnPlant);

                    }

                    // 모바일의 기본 테이블은 sap.m.Table
                    if (oTable.bindItems) {
                        oTable.bindAggregation("items", {
                            path: "plantModel>/",
                            template: new ColumnListItem({
                                cells: [
                                    new Label({ text: "{plantModel>Plant}" }),
                                ]
                            }),
                            events: {
                                dataReceived: function () {
                                    oDialogSuggestions.update();
                                }
                            }
                        });
                        oTable.addColumn(new MColumn({ header: new Label({ text: "플랜트" }) }));
                    }
                    oDialogSuggestions.update();
                }.bind(this));

                if (this.byId("VHPlant")) {
                    this._oMultiInputWithSuggestions = this.byId("VHPlant");
                } else {
                    MessageBox.error("MultiInput의 ID 'VHPlant'를 찾을 수 없습니다.");
                }

                // _oMultiInputWithSuggestions가 올바르게 초기화된 경우에만 setTokens 호출
                if (this._oMultiInputWithSuggestions) {
                    oDialogSuggestions.setTokens(this._oMultiInputWithSuggestions.getTokens());
                }

                oDialogSuggestions.open();
            }.bind(this));
        },
        onPlantOk: function (oEvent) {
			var aTokens = oEvent.getParameter("tokens");
			this._oMultiInputWithSuggestions.setTokens(aTokens);
			this._oVHDWithSuggestions.close();
		},
		onPlantCancel: function () {
			this._oVHDWithSuggestions.close();
		},
		onPlantSearch: function (oEvent) {
			var sSearchQuery = this._oBasicSearchFieldWithSuggestions.getValue(),
				aSelectionSet = oEvent.getParameter("selectionSet"),
				aFilters = aSelectionSet && aSelectionSet.reduce(function (aResult, oControl) {
				if (oControl.getValue()) {
					aResult.push(new Filter({
						path: oControl.getName(),
						operator: FilterOperator.Contains,
						value1: oControl.getValue()
					}));
				}

				return aResult;
			}, []);

			aFilters.push(new Filter({
				filters: [
					new Filter({ path: "Plant", operator: FilterOperator.Contains, value1: sSearchQuery }),
				],
				and: false
			}));

			this._filterTableWithSuggestions(new Filter({
				filters: aFilters,
				and: true
			}));
		},
		_filterTableWithSuggestions: function (oFilter) {
			var oVHD = this._oVHDWithSuggestions;
			oVHD.getTableAsync().then(function (oTable) {
				if (oTable.bindRows) {
					oTable.getBinding("rows").filter(oFilter);
				}
				if (oTable.bindItems) {
					oTable.getBinding("items").filter(oFilter);
				}
				oVHD.update();
			});
		},
		onPlantClose: function () {
			this._oVHDWithSuggestions.destroy();
		},

        onPlantSelected: function (oEvent) {
            var oMultiInput = oEvent.getSource();
            var oSelectedItem = oEvent.getParameter("selectedRow"); // 선택된 행 가져오기

            if (oSelectedItem) {
                var oContext = oSelectedItem.getBindingContext("plantModel");
                var sKey = oContext.getProperty("Plant"); // 키 값 가져오기

                // 키 값을 토큰으로 추가
                oMultiInput.addToken(new Token({
                    key: sKey,
                    text: sKey
                }));

                // 입력 값을 지우기 (선택 후 텍스트 박스를 비움)
                oMultiInput.setValue("");
            }
        },
        onPlantFocusOut: function (oEvent) {
            var oMultiInput = this.byId("VHPlant");
            
            // 텍스트 필드를 지우기
            oMultiInput.setValue("");
        },
        // 작업장 valuehelp 끝

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
                            var aFilterOpi = this.getModel("dataModel").getData().Items.filter(function (item) {
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
                                    MessageBox.information("엑셀 파일이 업로드 되지 않았습니다.");
                                });
                            }.bind(this));
                            MessageBox.information("엑셀 파일이 업로드 되었습니다.");
        
                            // 데이터 새로고침
                            this._getData();
                        }.bind(this)); // 'this' 컨텍스트를 유지
                    }.bind(this)); // 'this' 컨텍스트를 유지
                }.bind(this); // 'this' 컨텍스트를 유지
        
                reader.readAsBinaryString(file);
            }
        },

        // table standard (vm)
          // vm standard  개인화 엔진을 설정하고 테이블을 등록
        _registerForP13n: function() {
			const oTable = this.byId("dataTable");

			this.oMetadataHelper = new MetadataHelper([{
					key: "Plant",
					label: "플랜트",
					path: "Plant"
				},
				{
					key: "Operationid",
					label: "공정코드",
					path: "Operationid"
				},
				{
					key: "OperationidText",
					label: "공정코드명",
					path: "OperationidText"
				},
				{
					key: "Workcenter",
					label: "작업장",
					path: "Workcenter"
				},
                {
					key: "WorkcenterText",
					label: "작업장명",
					path: "WorkcenterText"
				}
			]);

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
					Filter: new FilterController({
						control: oTable
					})
				}
			});

			Engine.getInstance().attachStateChange(this.handleStateChange.bind(this));
		},

		openPersoDialog: function(oEvt) {
			this._openPersoDialog(["Columns", "Sorter", "Groups", "Filter"], oEvt.getSource());
		},

		_openPersoDialog: function(aPanels, oSource) {
			var oTable = this.byId("dataTable");

			Engine.getInstance().show(oTable, aPanels, {
				contentHeight: aPanels.length > 1 ? "50rem" : "35rem",
				contentWidth: aPanels.length > 1 ? "45rem" : "32rem",
				source: oSource || oTable
			});
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

			 // 선택된 상태에 따라 열을 업데이트
			this.updateColumns(oState);

			// 필터 및 정렬 생성
			const aFilter = this.createFilters(oState);
			const aGroups = this.createGroups(oState);
			const aSorter = this.createSorters(oState, aGroups);

			const aCells = oState.Columns.map(function(oColumnState) {
				return new Text({
					text: "{" + this.oMetadataHelper.getProperty(oColumnState.key).path + "}"
				});
			}.bind(this));

			// 업데이트된 셀 템플릿으로 테이블을 다시 바인딩
			oTable.bindItems({
				templateShareable: false,
				path: 'dataModel>/Items',
				sorter: aSorter.concat(aGroups),
				filters: aFilter,
				template: new ColumnListItem({
					cells: aCells
				})
			});

		},

        //createFilters 함수는 현재 상태를 기반으로 필터를 생성
		createFilters: function(oState) {
			const aFilter = [];
			Object.keys(oState.Filter).forEach((sFilterKey) => {
				const filterPath = this.oMetadataHelper.getProperty(sFilterKey).path;

				oState.Filter[sFilterKey].forEach(function(oConditon) {
					aFilter.push(new Filter(filterPath, oConditon.operator, oConditon.values[0]));
				});
			});

			this.byId("filterInfo").setVisible(aFilter.length > 0);

			return aFilter;
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

			oTable.getColumns().forEach(function(oColumn, iIndex) {
				oColumn.setVisible(false);
				oColumn.setWidth(oState.ColumnWidth[this._getKey(oColumn)]);
				oColumn.setSortIndicator(coreLibrary.SortOrder.None);
				oColumn.data("grouped", false);
			}.bind(this));

			oState.Columns.forEach(function(oProp, iIndex) {
				const oCol = this.byId(oProp.key);
				oCol.setVisible(true);

				oTable.removeColumn(oCol);
				oTable.insertColumn(oCol, iIndex);
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
			} else if (oColumnHeaderItem.getIcon().indexOf("filter") >= 0) {
				sPanel = "Filter";
			}

			this._openPersoDialog([sPanel]);
		},

        // 필터 정보 클릭 시 필터 대화 상자 열기
		onFilterInfoPress: function(oEvt) {
			this._openPersoDialog(["Filter"], oEvt.getSource());
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
		},

        // 필터 초기화
		onClearFilterPress: function(oEvt) {
			const oTable = this.byId("dataTable");
			Engine.getInstance().retrieveState(oTable).then(function(oState) {
				for (var sKey in oState.Filter) {
					oState.Filter[sKey].map((condition) => {
						condition.filtered = false;
					});
				}
				Engine.getInstance().applyState(oTable, oState);
			});
		}
    });
});
