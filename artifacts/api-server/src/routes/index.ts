import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dashboardRouter from "./dashboard";
import propertiesRouter from "./properties";
import unitsRouter from "./units";
import tenantsRouter from "./tenants";
import paymentsRouter from "./payments";
import agreementsRouter from "./agreements";
import maintenanceRouter from "./maintenance";
import expensesRouter from "./expenses";
import vendorsRouter from "./vendors";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dashboardRouter);
router.use(propertiesRouter);
router.use(unitsRouter);
router.use(tenantsRouter);
router.use(paymentsRouter);
router.use(agreementsRouter);
router.use(maintenanceRouter);
router.use(expensesRouter);
router.use(vendorsRouter);

export default router;
