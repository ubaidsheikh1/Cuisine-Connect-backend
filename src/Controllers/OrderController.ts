// import Stripe from "stripe";
// import { Request, Response } from "express";
// import Restaurant, { MenuItemType } from "../models/restaurant";
// import Order from "../models/order";

// const STRIPE = new Stripe(process.env.STRIPE_API_KEY as string);
// const FRONTEND_URL = process.env.FRONTEND_URL as string;
// const STRIPE_ENDPOINT_SECRET = process.env.STRIPE_WEBHOOK_SECRET as string;

// const getMyOrders = async (req: Request, res: Response) => {
//     try {
//         const orders = await Order.find({ user: req.userId })
//             .populate("restaurant")
//             .populate("user");
//         res.json(orders);
//     } catch (error: any) { // Explicitly specify error type
//         console.error("Error fetching orders:", error);
//         res.status(500).json({ message: "Something went wrong" });
//     }
// };

// type CheckoutSessionRequest = {
//     cartItems: {
//         menuItemId: string;
//         name: string;
//         quantity: number; // Corrected the type to number
//     }[];
//     deliveryDetails: {
//         email: string;
//         name: string;
//         addressLine1: string;
//         city: string;
//     };
//     restaurantId: string;
// };

// const stripeWebhookHandler = async (req: Request, res: Response) => {
//     try {
//         const sig = req.headers["stripe-signature"] as string;
//         const event = STRIPE.webhooks.constructEvent(req.body, sig, STRIPE_ENDPOINT_SECRET);
        
//         if (event.type === "checkout.session.completed") {
//             const orderId = event.data.object.metadata?.orderId;
//             if (!orderId) {
//                 return res.status(400).json({ message: "Order ID not provided in metadata" });
//             }

//             const order = await Order.findById(orderId);
//             if (!order) {
//                 return res.status(404).json({ message: "Order not found" });
//             }

//             order.totalAmount = event.data.object.amount_total;
//             order.status = "paid";
//             await order.save();
//         }
//         res.status(200).send();
//     } catch (error: any) { // Explicitly specify error type
//         console.error("Webhook error:", error);
//         res.status(400).send(`Webhook error: ${error.message}`);
//     }
// };

// const createCheckoutSession = async (req: Request, res: Response) => {
//     try {
//         const checkoutSessionRequest: CheckoutSessionRequest = req.body;
//         const restaurant = await Restaurant.findById(checkoutSessionRequest.restaurantId);
//         if (!restaurant) {
//             throw new Error("Restaurant not found");
//         }

//         const lineItems = createLineItems(checkoutSessionRequest.cartItems, restaurant.menuItems);
//         const session = await createSession(lineItems, restaurant.deliveryPrice, req.userId);

//         await saveOrder(req.userId, checkoutSessionRequest, restaurant, session);

//         res.json({ url: session.url });
//     } catch (error: any) { // Explicitly specify error type
//         console.error("Checkout session creation error:", error);
//         res.status(500).json({ message: error.message });
//     }
// };

// const createLineItems = (
//     cartItems: CheckoutSessionRequest['cartItems'],
//     menuItems: MenuItemType[]
// ) => {
//     return cartItems.map(cartItem => {
//         const menuItem = menuItems.find(item => item._id.toString() === cartItem.menuItemId);
//         if (!menuItem) {
//             throw new Error(`Menu item not found: ${cartItem.menuItemId}`);
//         }
//         return {
//             price_data: {
//                 currency: "inr",
//                 unit_amount: menuItem.price,
//                 product_data: {
//                     name: menuItem.name,
//                 },
//             },
//             quantity: cartItem.quantity,
//         };
//     });
// };

// const createSession = async (
//     lineItems: Stripe.Checkout.SessionCreateParams.LineItem[],
//     deliveryPrice: number,
//     userId: string
// ) => {
//     return STRIPE.checkout.sessions.create({
//         line_items: lineItems,
//         shipping_options: [{
//             shipping_rate_data: {
//                 display_name: "Delivery",
//                 type: "fixed_amount",
//                 fixed_amount: {
//                     amount: deliveryPrice,
//                     currency: "inr",
//                 },
//             },
//         }],
//         mode: "payment",
//         metadata: { userId },
//         success_url: `${FRONTEND_URL}/order-status?success=true`,
//         cancel_url: `${FRONTEND_URL}/checkout/cancelled`,
//     });
// };

// const saveOrder = async (
//     userId: string,
//     checkoutSessionRequest: CheckoutSessionRequest,
//     restaurant: any,
//     session: any
// ) => {
//     const newOrder = new Order({
//         restaurant: restaurant._id,
//         user: userId,
//         status: "placed",
//         deliveryDetails: checkoutSessionRequest.deliveryDetails,
//         cartItems: checkoutSessionRequest.cartItems,
//         createdAt: new Date(),
//         stripeSessionId: session.id,
//     });
//     await newOrder.save();
// };

// export default {
//     getMyOrders,
//     createCheckoutSession,
//     stripeWebhookHandler,
// };










import Stripe from "stripe";
import { Request, Response } from "express";
import Restaurant, { MenuItemType } from "../models/restaurant";
import Order from "../models/order";

const STRIPE = new Stripe(process.env.STRIPE_API_KEY as string);
const FRONTEND_URL = process.env.FRONTEND_URL as string;
const STRIPE_ENDPOINT_SECRET = process.env.STRIPE_WEBHOOK_SECRET as string;

const getMyOrders = async (req: Request, res: Response) => {
  try {
    const orders = await Order.find({ user: req.userId })
      .populate("restaurant")
      .populate("user");

    res.json(orders);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "something went wrong" });
  }
};

type CheckoutSessionRequest = {
  cartItems: {
    menuItemId: string;
    name: string;
    quantity: string;
  }[];
  deliveryDetails: {
    email: string;
    name: string;
    addressLine1: string;
    city: string;
  };
  restaurantId: string;
};

const stripeWebhookHandler = async (req: Request, res: Response) => {
  let event;

  try {
    const sig = req.headers["stripe-signature"];
    event = STRIPE.webhooks.constructEvent(
      req.body,
      sig as string,
      STRIPE_ENDPOINT_SECRET
    );
  } catch (error: any) {
    console.log(error);
    return res.status(400).send(`Webhook error: ${error.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const order = await Order.findById(event.data.object.metadata?.orderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    order.totalAmount = event.data.object.amount_total;
    order.status = "paid";

    await order.save();
  }

  res.status(200).send();
};

const createCheckoutSession = async (req: Request, res: Response) => {
  try {
    const checkoutSessionRequest: CheckoutSessionRequest = req.body;

    const restaurant = await Restaurant.findById(
      checkoutSessionRequest.restaurantId
    );

    if (!restaurant) {
      throw new Error("Restaurant not found");
    }

    const newOrder = new Order({
      restaurant: restaurant,
      user: req.userId,
      status: "placed",
      deliveryDetails: checkoutSessionRequest.deliveryDetails,
      cartItems: checkoutSessionRequest.cartItems,
      createdAt: new Date(),
    });

    const lineItems = createLineItems(
      checkoutSessionRequest,
      restaurant.menuItems
    );

    const session = await createSession(
      lineItems,
      newOrder._id.toString(),
      restaurant.deliveryPrice,
      restaurant._id.toString()
    );

    if (!session.url) {
      return res.status(500).json({ message: "Error creating stripe session" });
    }

    await newOrder.save();
    res.json({ url: session.url });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ message: error.raw.message });
  }
};

const createLineItems = (
  checkoutSessionRequest: CheckoutSessionRequest,
  menuItems: MenuItemType[]
) => {
  const lineItems = checkoutSessionRequest.cartItems.map((cartItem) => {
    const menuItem = menuItems.find(
      (item) => item._id.toString() === cartItem.menuItemId.toString()
    );

    if (!menuItem) {
      throw new Error(`Menu item not found: ${cartItem.menuItemId}`);
    }

    const line_item: Stripe.Checkout.SessionCreateParams.LineItem = {
      price_data: {
        currency: "inr",
        unit_amount: menuItem.price,
        product_data: {
          name: menuItem.name,
        },
      },
      quantity: parseInt(cartItem.quantity),
    };

    return line_item;
  });

  return lineItems;
};

const createSession = async (
  lineItems: Stripe.Checkout.SessionCreateParams.LineItem[],
  orderId: string,
  deliveryPrice: number,
  restaurantId: string
) => {
  const sessionData = await STRIPE.checkout.sessions.create({
    line_items: lineItems,
    shipping_options: [
      {
        shipping_rate_data: {
          display_name: "Delivery",
          type: "fixed_amount",
          fixed_amount: {
            amount: deliveryPrice,
            currency: "inr",
          },
        },
      },
    ],
    mode: "payment",
    metadata: {
      orderId,
      restaurantId,
    },
    success_url: `${FRONTEND_URL}/order-status?success=true`,
    cancel_url: `${FRONTEND_URL}/detail/${restaurantId}?cancelled=true`,
  });

  return sessionData;
};

export default {
  getMyOrders,
  createCheckoutSession,
  stripeWebhookHandler,
};
