import { Router } from 'express';
import { storeController } from '../controllers';
import { validate, createRateLimiter } from '../middlewares';
import { contactInquirySchema, productIdParamSchema, submitReviewSchema } from '../validations';

const router = Router();
const publicLimiter = createRateLimiter(60_000, 30);

router.get('/bootstrap', storeController.getBootstrap);
router.get('/products', storeController.getProducts);
router.get('/products/:id', validate(productIdParamSchema), storeController.getProductById);
router.post('/contact', publicLimiter, validate(contactInquirySchema), storeController.submitContact);
router.post('/reviews', publicLimiter, validate(submitReviewSchema), storeController.submitReview);

export default router;
