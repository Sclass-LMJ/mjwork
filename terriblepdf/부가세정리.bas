Sub 부가세정리()
    Dim necessaryPage As String
    Dim textFilePath As String
    Dim textContent As String
    Dim startPos As Long, endPos As Long
    Dim fso As Object
    Dim fd As fileDialog
    Dim stream As Object
    
    ' FileDialog로 텍스트 파일 선택
    Set fd = Application.fileDialog(msoFileDialogFilePicker)
    
    With fd
        .Title = "부가가치세 신고서 텍스트 파일을 선택하세요"
        .Filters.Clear
        .Filters.Add "텍스트 파일", "*.txt"
        .Filters.Add "모든 파일", "*.*"
        .AllowMultiSelect = False
        
        If .Show = -1 Then
            textFilePath = .SelectedItems(1)
        Else
            MsgBox "파일이 선택되지 않았습니다.", vbExclamation
            Exit Sub
        End If
    End With
    
    ' ADODB.Stream을 사용하여 UTF-8 텍스트 파일 읽기
    Set fso = CreateObject("Scripting.FileSystemObject")
    
    If Not fso.FileExists(textFilePath) Then
        MsgBox "파일을 찾을 수 없습니다.", vbCritical
        Exit Sub
    End If
    
    ' ADODB.Stream으로 UTF-8 파일 읽기
    Set stream = CreateObject("ADODB.Stream")
    
    With stream
        .Type = 2 ' adTypeText
        .Charset = "UTF-8"
        .Open
        .LoadFromFile textFilePath
        textContent = .ReadText
        .Close
    End With
    
    ' 페이지 1부터 페이지 3까지 추출
    startPos = InStr(textContent, "--- 페이지 1 ---")
    endPos = InStr(textContent, "--- 페이지 5 ---")
    
    If startPos > 0 And endPos > 0 Then
        necessaryPage = Mid(textContent, startPos, endPos - startPos)
    Else
        MsgBox "필요한 페이지를 찾을 수 없습니다."
        Exit Sub
    End If
    
    ' 워크시트 참조
    Dim wsInfo As Worksheet
    Dim wsResult As Worksheet
    
    ' "수   시   부   과   세   액   ( 2 5 )" 텍스트 존재 여부 확인
    Dim useSheet2 As Boolean
    useSheet2 = (InStr(necessaryPage, "수   시   부   과   세   액   ( 2 5 )") > 0)
    
    ' 적절한 정보 시트 선택
    If useSheet2 Then
        On Error Resume Next
        Set wsInfo = ThisWorkbook.Worksheets("부가세정보시트_2")
        On Error GoTo 0
        
        If wsInfo Is Nothing Then
            MsgBox "부가세정보시트_2를 찾을 수 없습니다. 기본 시트를 사용합니다.", vbExclamation
            Set wsInfo = ThisWorkbook.Worksheets("부가세정보시트")
        End If
    Else
        Set wsInfo = ThisWorkbook.Worksheets("부가세정보시트")
    End If
    
    ' 결과 시트가 없으면 생성
    On Error Resume Next
    Set wsResult = ThisWorkbook.Worksheets("부가세신고정리시트")
    On Error GoTo 0
    
    If wsResult Is Nothing Then
        ' 새 시트 생성 (첫 번째 위치에)
        Set wsResult = ThisWorkbook.Worksheets.Add(Before:=ThisWorkbook.Worksheets(1))
        wsResult.Name = "부가세신고정리시트"
    Else
        ' 기존 시트가 있으면 완전히 초기화하고 첫 번째 위치로 이동
        wsResult.Cells.Clear ' 모든 내용 삭제
        wsResult.Cells.ClearFormats ' 모든 서식 삭제
        wsResult.Move Before:=ThisWorkbook.Worksheets(1)
    End If
    
    ' 부가세정보시트를 항상 마지막 위치로 이동
    wsInfo.Move After:=ThisWorkbook.Worksheets(ThisWorkbook.Worksheets.Count)
    
    ' 부가세정보시트_2도 있으면 마지막으로 이동
    Dim wsInfo2 As Worksheet
    On Error Resume Next
    Set wsInfo2 = ThisWorkbook.Worksheets("부가세정보시트_2")
    On Error GoTo 0
    
    If Not wsInfo2 Is Nothing Then
        wsInfo2.Move After:=ThisWorkbook.Worksheets(ThisWorkbook.Worksheets.Count)
    End If
    
    ' 파일명 추출 (경로 제외, 확장자 포함)
    Dim fileName As String
    Dim fileNameOnly As String
    fileName = fso.GetFileName(textFilePath)
    fileNameOnly = fso.GetBaseName(textFilePath) ' 확장자 제외
    
    ' 헤더 작성
    wsResult.Cells(1, 1).value = "파일명"
    wsResult.Cells(1, 2).value = "구분"
    wsResult.Cells(1, 3).value = "순번"
    wsResult.Cells(1, 4).value = "금액"
    wsResult.Cells(1, 5).value = "세액"
    
    ' 부가세정보시트 데이터 처리
    Dim lastRow As Long
    Dim i As Long
    Dim resultRow As Long
    
    lastRow = wsInfo.Cells(wsInfo.Rows.Count, 1).End(xlUp).row
    resultRow = 2
    
    Dim 구분 As String
    Dim 순번 As String
    Dim 시작텍스트 As String
    Dim 종료텍스트 As String
    Dim 구분자 As String
    Dim 추출텍스트 As String
    Dim 시작위치 As Long
    Dim 종료위치 As Long
    Dim dataArray() As String
    Dim 금액 As String
    Dim 세액 As String
    Dim 금액숫자 As Double
    Dim 세액숫자 As Double
    
    For i = 2 To lastRow
        ' 변수 초기화
        금액 = ""
        세액 = ""
        
        구분 = wsInfo.Cells(i, 1).value
        순번 = wsInfo.Cells(i, 2).value
        시작텍스트 = wsInfo.Cells(i, 3).value
        종료텍스트 = wsInfo.Cells(i, 4).value
        구분자 = wsInfo.Cells(i, 5).value
        
        ' 시작텍스트와 종료텍스트 사이의 내용 추출
        시작위치 = InStr(necessaryPage, 시작텍스트)
        If 시작위치 > 0 Then
            종료위치 = InStr(시작위치 + Len(시작텍스트), necessaryPage, 종료텍스트)
        Else
            종료위치 = 0
        End If
        
        ' 결과 시트에 기본 정보 먼저 쓰기
        wsResult.Cells(resultRow, 1).value = fileNameOnly ' 파일명 (확장자 제외)
        wsResult.Cells(resultRow, 2).value = 구분
        wsResult.Cells(resultRow, 3).value = 순번
        
        If 시작위치 > 0 And 종료위치 > 0 And 종료위치 > 시작위치 Then
            추출텍스트 = Mid(necessaryPage, 시작위치 + Len(시작텍스트), 종료위치 - (시작위치 + Len(시작텍스트)))
            추출텍스트 = Trim(추출텍스트)
            
            ' 3칸 공백으로 분리
            dataArray = Split(추출텍스트, "   ")
            
            ' 배열을 정제 (빈 값 제거)
            Dim cleanArray() As String
            Dim cleanIndex As Long
            Dim j As Long
            cleanIndex = 0
            
            ReDim cleanArray(UBound(dataArray))
            For j = 0 To UBound(dataArray)
                If Trim(dataArray(j)) <> "" Then
                    cleanArray(cleanIndex) = Trim(dataArray(j))
                    cleanIndex = cleanIndex + 1
                End If
            Next j
            
            ' 구분자에 따라 금액과 세액 추출
            금액 = ""
            세액 = ""
            
            Select Case 구분자
                Case "금액_세율_세액"
                    If cleanIndex >= 3 Then
                        금액 = cleanArray(0)
                        세액 = cleanArray(2)
                    End If
                    
                Case "금액_세액"
                    If cleanIndex >= 2 Then
                        금액 = cleanArray(0)
                        세액 = cleanArray(1)
                    End If
                    
                Case "금액"
                    If cleanIndex >= 1 Then
                        금액 = cleanArray(0)
                    End If
                    
                    
                Case "세액"
                    If cleanIndex >= 1 Then
                        세액 = cleanArray(0)
                    End If
                    
                Case "금액_세율"
                    If cleanIndex >= 2 Then
                        금액 = cleanArray(0)
                    End If
                    
                Case "세율_세액"
                    If cleanIndex >= 2 Then
                        세액 = cleanArray(1)
                    End If
            End Select
            
            ' 금액과 세액의 공백 제거 및 숫자 변환
            If 금액 <> "" Then
                금액 = Replace(금액, " ", "") ' 모든 공백 제거
            End If
            
            If 세액 <> "" Then
                세액 = Replace(세액, " ", "") ' 모든 공백 제거
            End If
            
            ' 금액 입력 (숫자로 변환)
            If 금액 <> "" Then
                On Error Resume Next
                금액숫자 = CDbl(Replace(금액, ",", ""))
                If Err.Number = 0 Then
                    wsResult.Cells(resultRow, 4).value = 금액숫자
                    wsResult.Cells(resultRow, 4).NumberFormat = "#,##0"
                Else
                    wsResult.Cells(resultRow, 4).value = 금액 ' 변환 실패 시 원본 유지
                End If
                Err.Clear
                On Error GoTo 0
            End If
            
            ' 세액 입력 (숫자로 변환)
            If 세액 <> "" Then
                On Error Resume Next
                세액숫자 = CDbl(Replace(세액, ",", ""))
                If Err.Number = 0 Then
                    wsResult.Cells(resultRow, 5).value = 세액숫자
                    wsResult.Cells(resultRow, 5).NumberFormat = "#,##0"
                Else
                    wsResult.Cells(resultRow, 5).value = 세액 ' 변환 실패 시 원본 유지
                End If
                Err.Clear
                On Error GoTo 0
            End If
        Else
            ' 텍스트를 찾지 못한 경우 오류 표시
            wsResult.Cells(resultRow, 4).value = "오류발생"
            wsResult.Cells(resultRow, 5).value = "오류발생"
        End If
        
        resultRow = resultRow + 1
    Next i
    
    ' 서식 정리
    ' 데이터가 있는 전체 범위 가운데 정렬
    Dim lastDataRow As Long
    lastDataRow = wsResult.Cells(wsResult.Rows.Count, 1).End(xlUp).row
    
    With wsResult.Range("A1:E" & lastDataRow)
        .HorizontalAlignment = xlCenter ' 가로 가운데 정렬
        .VerticalAlignment = xlCenter ' 세로 가운데 정렬
    End With
    
    ' 헤더 서식
    wsResult.Range("A1:E1").Font.Bold = True
    wsResult.Range("A1:E1").Interior.Color = RGB(200, 200, 200)
    
    ' 열 너비 자동 조정
    wsResult.Columns("A:E").AutoFit
    
    ' 부가세신고정리시트 활성화
    wsResult.Activate
    
    MsgBox "부가세 정리가 완료되었습니다.", vbInformation
    
End Sub



