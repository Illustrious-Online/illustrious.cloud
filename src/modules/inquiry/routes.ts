import { eq } from "drizzle-orm";
import { Elysia } from "elysia";
import { db } from "@/drizzle/db";
import { org } from "@/drizzle/schema";
import { getSessionFromHeader } from "@/lib/auth";
import { BadRequestError, NotFoundError } from "@/plugins/error";
import { createAuthHelpers } from "../auth/middleware";
import { sendMail } from "../mailer/service";
import { verifyRecaptcha } from "../recaptcha/service";
import { inquiryModel } from "./model";
import { createInquiry, getInquiryById, getUserInquiries } from "./service";

export const inquiryRoutes = new Elysia({ prefix: "/inquiries" })
  .use(inquiryModel)
  .derive(async ({ headers }) => {
    const { session, user } = await getSessionFromHeader(headers.authorization);
    return createAuthHelpers(session, user);
  })
  .post(
    "/",
    async ({ body, getAuth, set }) => {
      // Optional authentication - check for auth token
      const authContext = getAuth();
      const userId = authContext?.userId;

      // Verify reCAPTCHA (required for public inquiry submissions)
      try {
        await verifyRecaptcha(body.recaptchaToken);
      } catch (error) {
        throw new BadRequestError(
          error instanceof Error
            ? error.message
            : "reCAPTCHA verification failed",
        );
      }

      // Create inquiry
      const newInquiry = await createInquiry(
        {
          orgId: body.orgId,
          name: body.name,
          email: body.email,
          phone: body.phone || null,
          comment: body.comment,
        },
        userId,
      );

      // Optionally send notification email to org contact
      try {
        const [foundOrg] = await db
          .select()
          .from(org)
          .where(eq(org.id, body.orgId))
          .limit(1);

        if (foundOrg?.contact) {
          await sendMail({
            to: foundOrg.contact,
            subject: `New Inquiry from ${body.name}`,
            html: `<p>You have received a new inquiry:</p>
                   <p><strong>Name:</strong> ${body.name}</p>
                   <p><strong>Email:</strong> ${body.email}</p>
                   ${body.phone ? `<p><strong>Phone:</strong> ${body.phone}</p>` : ""}
                   <p><strong>Comment:</strong> ${body.comment}</p>`,
          });
        }
      } catch (error) {
        // Log error but don't fail inquiry creation
        console.error("Failed to send notification email:", error);
      }

      set.status = 201;
      return {
        id: newInquiry.id,
        orgId: newInquiry.orgId,
        userId: newInquiry.userId,
        name: newInquiry.name,
        email: newInquiry.email,
        phone: newInquiry.phone,
        comment: newInquiry.comment,
        createdAt: newInquiry.createdAt,
      };
    },
    {
      body: "createInquiryBody",
      response: {
        201: "inquiryResponse",
      },
    },
  )
  .get(
    "/",
    async ({ requireAuth }) => {
      const authContext = await requireAuth();
      const inquiries = await getUserInquiries(authContext.userId);
      return inquiries.map((inq) => ({
        id: inq.id,
        orgId: inq.orgId,
        userId: inq.userId,
        name: inq.name,
        email: inq.email,
        phone: inq.phone,
        comment: inq.comment,
        createdAt: inq.createdAt,
      }));
    },
    {
      response: {
        200: "inquiryListResponse",
      },
    },
  )
  .get(
    "/:id",
    async ({ requireAuth, params }) => {
      const authContext = await requireAuth();
      const foundInquiry = await getInquiryById(params.id, authContext.userId);

      if (!foundInquiry) {
        throw new NotFoundError("Inquiry not found or access denied");
      }

      return {
        id: foundInquiry.id,
        orgId: foundInquiry.orgId,
        userId: foundInquiry.userId,
        name: foundInquiry.name,
        email: foundInquiry.email,
        phone: foundInquiry.phone,
        comment: foundInquiry.comment,
        createdAt: foundInquiry.createdAt,
      };
    },
    {
      response: {
        200: "inquiryResponse",
      },
    },
  );
