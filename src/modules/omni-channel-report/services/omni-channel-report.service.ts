import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { OmniChannelReportDocument, OmniChannelReportSchema } from "../schema/omni-channel-report.schema";
import { OmnichannelmessageDocument, OmnichannelmessageSchema } from "src/modules/omnichannel-message/schema/omnichannelmessage.schema";


@Injectable()
export class OmniChannelReportService {
  constructor(
    @InjectModel(OmniChannelReportSchema.name)
    private readonly omni_channel_report: Model<OmniChannelReportDocument>,
    @InjectModel(OmnichannelmessageSchema.name)
    private readonly omnichannel_message: Model<OmnichannelmessageDocument>
  ) { }

  /**
   * GET : Fetch ALL users by tenant_uuid
   */
  async findAllUsers(query: any) {
    const { tenant_uuid } = query;

    if (!tenant_uuid) {
      return {
        total: 0,
        data: [],
        activeCount: 0,
        inActiveCount: 0
      };
    }

    const data = await this.omni_channel_report.aggregate([
      {
        $match: { tenant_uuid },
      },

      // 🔹 USER LOOKUP
      {
        $lookup: {
          from: "user",
          localField: "user_uuid",
          foreignField: "uuid",
          as: "user",
        },
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true,
        },
      },

      // 🔹 LEAD LOOKUP
      {
        $lookup: {
          from: "lead_management",
          localField: "lead_management_uuid",
          foreignField: "lead_management_uuid",
          as: "lead",
        },
      },
      {
        $unwind: {
          path: "$lead",
          preserveNullAndEmptyArrays: true,
        },
      },

      // 🔹 CAMPAIGN LOOKUP
      {
        $lookup: {
          from: "blended_campaign",
          localField: "campaign_uuid",
          foreignField: "uuid",
          as: "campaign",
        },
      },
      {
        $unwind: {
          path: "$campaign",
          preserveNullAndEmptyArrays: true,
        },
      },

      // 🔹 FINAL SHAPE
      {
        $addFields: {
          user_name: "$user.username",
          lead_name: {
            $trim: {
              input: {
                $concat: [
                  { $ifNull: ["$lead.first_name", ""] },
                  " ",
                  { $ifNull: ["$lead.last_name", ""] }
                ]
              }
            }
          },
          campaign_name: "$campaign.name",
        },
      },

      // 🔹 REMOVE TEMP FIELDS
      {
        $project: {
          user: 0,
          lead: 0,
          campaign: 0,
        },
      },

      // 🔹 SORT
      {
        $sort: { createdAt: -1 },
      },
    ]);

    // console.log("lddassaasadaadsdsdaa", data);

    // ===============================
    // UNREAD MESSAGE COUNT
    // ===============================
    const inActiveCount = await this.omnichannel_message.countDocuments({
      tenant_uuid,
      user_uuid: ""    // unread condition
    });

    return {
      statusCode: 200,
      data: {
        list: data,
        activeCount: data.length,
        inActiveCount
      }
    };

  }


  /**
   * POST : Search omni users
   * Filters: user_name, channel_type, campaign_type
   */
  /**
   * POST : Search omni users
   * Filters: user_uuid, user_name, channel_type, campaign_type, campaign_uuid
   */
  async searchUsers(body: any) {
    const {
      tenant_uuid,
      user_uuid,     // ✅ add this in payload from frontend
      user_name,
      channel_type,
      campaign_type,
      campaign_uuid,
    } = body;

    if (!tenant_uuid) {
      return {
        statusCode: 200,
        data: {
          list: [],
          activeCount: 0,
          inActiveCount: 0,
        },
      };
    }

    // ✅ Base match filter (only fields that exist in omni_channel_report collection)
    const matchFilter: any = { tenant_uuid };

    if (user_uuid) matchFilter.user_uuid = user_uuid;
    if (channel_type) matchFilter.channel_type = channel_type;
    if (campaign_type) matchFilter.campaign_type = campaign_type;
    if (campaign_uuid) matchFilter.campaign_uuid = campaign_uuid;

    const pipeline: any[] = [
      { $match: matchFilter },

      // 🔹 USER LOOKUP
      {
        $lookup: {
          from: "user",
          localField: "user_uuid",
          foreignField: "uuid",
          as: "user",
        },
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true,
        },
      },

      // ✅ If user_name is provided, filter after lookup
      ...(user_name
        ? [
          {
            $match: {
              "user.username": { $regex: user_name, $options: "i" },
            },
          },
        ]
        : []),

      // 🔹 LEAD LOOKUP
      {
        $lookup: {
          from: "lead_management",
          localField: "lead_management_uuid",
          foreignField: "lead_management_uuid",
          as: "lead",
        },
      },
      {
        $unwind: {
          path: "$lead",
          preserveNullAndEmptyArrays: true,
        },
      },

      // 🔹 CAMPAIGN LOOKUP
      {
        $lookup: {
          from: "blended_campaign",
          localField: "campaign_uuid",
          foreignField: "uuid",
          as: "campaign",
        },
      },
      {
        $unwind: {
          path: "$campaign",
          preserveNullAndEmptyArrays: true,
        },
      },

      // 🔹 FINAL SHAPE (same as findAllUsers)
      {
        $addFields: {
          user_name: "$user.username",
          lead_name: {
            $trim: {
              input: {
                $concat: [
                  { $ifNull: ["$lead.first_name", ""] },
                  " ",
                  { $ifNull: ["$lead.last_name", ""] },
                ],
              },
            },
          },
          campaign_name: "$campaign.name",
        },
      },

      // 🔹 REMOVE TEMP FIELDS
      {
        $project: {
          user: 0,
          lead: 0,
          campaign: 0,
        },
      },

      // 🔹 SORT (use createdAt like findAllUsers)
      { $sort: { createdAt: -1 } },
    ];

    const data = await this.omni_channel_report.aggregate(pipeline);

    // ✅ unread count (same logic you used)
    const inActiveCount = await this.omnichannel_message.countDocuments({
      tenant_uuid,
      user_uuid: "", // your unread condition
    });
    console.log(data,"data");
    
    return {
      statusCode: 200,
      data: {
        list: data,
        activeCount: data.length,
        inActiveCount,
      },
    };
  }


}
