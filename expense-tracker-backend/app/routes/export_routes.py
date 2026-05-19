"""Export and report generation endpoints.

Endpoints for exporting data in various formats.

Routes:
    GET /export/csv - Export transactions as CSV
    GET /export/report-csv - Export summary report as CSV
    GET /export/excel - Export data as Excel
    GET /export/pdf - Export report as PDF
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from datetime import date, timedelta
from io import BytesIO

from app.db.database import get_db
from app.dependencies.auth_dependencies import get_current_user, extract_user_id
from app.services.export_service import ExportService

router = APIRouter(prefix="/export", tags=["export"])


@router.get(
    "/csv",
    summary="Export transactions as CSV",
    description="Export expense and income transactions in CSV format"
)
def export_csv(
    start_date: date = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: date = Query(..., description="End date (YYYY-MM-DD)"),
    transaction_type: str = Query("all", pattern="^(all|expense|income)$", description="Transaction type"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Export transactions as CSV.
    
    Columns:
    - Date
    - Type (Expense/Income)
    - Amount
    - Category
    - Description
    - Created Date
    
    Query Parameters:
    - start_date: Start date (required)
    - end_date: End date (required)
    - transaction_type: "all", "expense", or "income"
    
    Example:
        GET /export/csv?start_date=2026-01-01&end_date=2026-05-11
    """
    user_id = extract_user_id(current_user)
    
    # Validate date range
    if start_date > end_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="start_date must be before end_date"
        )
    
    try:
        csv_file = ExportService.export_transactions_csv(
            db, user_id, start_date, end_date, transaction_type
        )
        
        filename = f"transactions_{start_date}_to_{end_date}.csv"
        return StreamingResponse(
            iter([csv_file.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get(
    "/report-csv",
    summary="Export financial report as CSV",
    description="Export financial summary report in CSV format"
)
def export_report_csv(
    start_date: date = Query(..., description="Report start date"),
    end_date: date = Query(..., description="Report end date"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Export financial summary report as CSV.
    
    Includes:
    - Income/expense totals
    - Savings metrics
    - Financial score
    - Category breakdown
    
    Example:
        GET /export/report-csv?start_date=2026-01-01&end_date=2026-05-11
    """
    user_id = extract_user_id(current_user)
    
    if start_date > end_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="start_date must be before end_date"
        )
    
    try:
        csv_file = ExportService.export_report_csv(db, user_id, start_date, end_date)
        
        filename = f"financial_report_{start_date}_to_{end_date}.csv"
        return StreamingResponse(
            iter([csv_file.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get(
    "/excel",
    summary="Export data as Excel workbook",
    description="Export comprehensive data in Excel format with multiple sheets"
)
def export_excel(
    start_date: date = Query(..., description="Export start date"),
    end_date: date = Query(..., description="Export end date"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Export data as Excel workbook.
    
    Multiple sheets:
    - Transactions: All expense/income records
    - Summary: Monthly financial summary
    - Categories: Category breakdown
    - Analytics: Key financial metrics
    
    Requires: openpyxl
    Install: pip install openpyxl
    
    Example:
        GET /export/excel?start_date=2026-01-01&end_date=2026-05-11
    """
    user_id = extract_user_id(current_user)
    
    if start_date > end_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="start_date must be before end_date"
        )
    
    try:
        excel_file = ExportService.export_to_excel(db, user_id, start_date, end_date)
        
        filename = f"financial_report_{start_date}_to_{end_date}.xlsx"
        return StreamingResponse(
            iter([excel_file.getvalue()]),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except ImportError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Excel export requires openpyxl. Install with: pip install openpyxl"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get(
    "/pdf",
    summary="Export report as PDF",
    description="Export financial report as formatted PDF document"
)
def export_pdf(
    start_date: date = Query(..., description="Report start date"),
    end_date: date = Query(..., description="Report end date"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Export financial report as PDF.
    
    Includes:
    - Financial summary
    - Key metrics
    - Category breakdown
    - Financial health score
    
    PDF formatting includes:
    - Professional layout
    - Formatted tables
    - Summary statistics
    
    Requires: reportlab
    Install: pip install reportlab
    
    Example:
        GET /export/pdf?start_date=2026-01-01&end_date=2026-05-11
    """
    user_id = extract_user_id(current_user)
    
    if start_date > end_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="start_date must be before end_date"
        )
    
    try:
        pdf_file = ExportService.export_to_pdf(db, user_id, start_date, end_date)
        
        filename = f"financial_report_{start_date}_to_{end_date}.pdf"
        return StreamingResponse(
            iter([pdf_file.getvalue()]),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except ImportError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="PDF export requires reportlab. Install with: pip install reportlab"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# Optional: Endpoint to list available exports
@router.get(
    "/formats",
    summary="Get available export formats",
    description="List supported export formats and their requirements"
)
def get_export_formats():
    """Get list of available export formats.
    
    Returns:
    - Format name
    - MIME type
    - Required dependencies
    - File extension
    """
    return {
        "formats": [
            {
                "name": "CSV",
                "mime_type": "text/csv",
                "extension": ".csv",
                "dependencies": [],
                "endpoint": "/export/csv",
                "description": "Comma-separated values for spreadsheets"
            },
            {
                "name": "Excel",
                "mime_type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "extension": ".xlsx",
                "dependencies": ["openpyxl"],
                "endpoint": "/export/excel",
                "description": "Microsoft Excel workbook with multiple sheets"
            },
            {
                "name": "PDF",
                "mime_type": "application/pdf",
                "extension": ".pdf",
                "dependencies": ["reportlab"],
                "endpoint": "/export/pdf",
                "description": "Formatted PDF report with summary and tables"
            }
        ]
    }
