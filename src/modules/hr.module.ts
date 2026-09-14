import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeeController } from '../controllers/employee.controller';
import { DepartmentController } from '../controllers/department.controller';
import { PositionController } from '../controllers/position.controller';
import { AttendanceController } from '../controllers/attendance.controller';
import { LeaveRequestController } from '../controllers/leave-request.controller';
import { PayrollController } from '../controllers/payroll.controller';
import { DocumentController } from '../controllers/document.controller';
import { EmployeeService } from '../services/employee.service';
import { DepartmentService } from '../services/department.service';
import { PositionService } from '../services/position.service';
import { AttendanceService } from '../services/attendance.service';
import { LeaveRequestService } from '../services/leave-request.service';
import { PayrollService } from '../services/payroll.service';
import { DocumentService } from '../services/document.service';
import { TenantContext } from '../services/tenant-context.service';
import { Employee } from '../models/employee.entity';
import { Department } from '../models/department.entity';
import { Position } from '../models/position.entity';
import { Attendance } from '../models/attendance.entity';
import { LeaveRequest } from '../models/leave-request.entity';
import { Payroll } from '../models/payroll.entity';
import { Document } from '../models/employee-document.entity';
import { UserModule } from './user.module';
import { AuthModule } from './auth.module';
import { LanguageModule } from './language.module';
import { UploadsModule } from './uploads.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Employee,
      Department,
      Position,
      Attendance,
      LeaveRequest,
      Payroll,
      Document,
    ]),
    UserModule,
    AuthModule,
    LanguageModule,
    UploadsModule,
  ],
  controllers: [EmployeeController, DepartmentController, PositionController, AttendanceController, LeaveRequestController, PayrollController, DocumentController],
  providers: [EmployeeService, DepartmentService, PositionService, AttendanceService, LeaveRequestService, PayrollService, DocumentService, TenantContext],
  exports: [EmployeeService, DepartmentService, PositionService, AttendanceService, LeaveRequestService, PayrollService, DocumentService],
})
export class HrModule {}
