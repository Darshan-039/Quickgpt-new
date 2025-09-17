import { request } from "express";
import Stripe from "stripe";
import Transaction from "../models/Transaction";
import User from "../models/User";

export const stripeWebhooks = async (request, responce) => {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
    const sig = request.headers["stripe-signature"]

    let event;

    try {
        event = stripe.webhooks.constructEvent(request.body, sig, process.env.STRIPE_WEBHOOK_SECRET)
    } catch (error) {
        return responce.status(400).send(`Webhook Error: ${error.message}`)
    }


    try {
        switch (event.type) {
            case "payment_intent.succeeded": {
                const paymentIntent = event.data.object;
                const sessionList = await stripe.checkout.sessions.list({
                    payment_intent: paymentIntent.id,
                })

                const session = sessionList.data[0];
                const { transactionId, appId } = session.metadata;

                if (appId === 'quickgpt') {
                    const transaction = await Transaction.findOne({ _id: transactionId, isPaid: false })

                    //Update Credits in User Account
                    await User.updateOne({ _id: transactionId.userId }, { $inc: { credits: transaction.credits } })

                    //Update credit Payment status
                    transaction.isPaid = true;
                    await transaction.save();
                }
                else {
                    return responce.json({ recevied: true, message: "Ignored event: Invalid app" })
                }

                break;
            }


            default:
                console.log("Unhandled event type:", event.type)
                break;
        }

        responce.json({ recevied: true })
    } catch (error) {
        console.log("Webhook processing error:", error);
        responce.status(500).send("Internal server Error")
    }
}