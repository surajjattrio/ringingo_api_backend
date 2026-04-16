import { Injectable } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateGoogleSheetDto } from '../dto/google-sheet.dto';
import { GoogleSheet, GoogleSheetDocument } from '../schema/google-sheet.schema';

@Injectable()
export class GoogleSheetConsumer {
    constructor(@InjectModel(GoogleSheet.name) private readonly googleSheetModel: Model<GoogleSheetDocument>) { }

    @EventPattern('google.sheet.process')
    async handleRow(@Payload() data: any) {
        console.log('[GoogleSheetConsumer] @EventPattern handler triggered!');
        console.log('[GoogleSheetConsumer] received payload:', JSON.stringify(data));

        if (!data) {
            console.error('[GoogleSheetConsumer] payload is null/undefined');
            return;
        }

        const { row, sheetDate } = data;

        if (!row || !Array.isArray(row)) {
            console.error('[GoogleSheetConsumer] row is not an array:', row);
            return;
        }

        console.log('[GoogleSheetConsumer] processing row, sheetDate=%s, row[0]=%s', sheetDate, row[0]);

        // Basic filters preserved from original implementation
        const orderPlace = row[9];
        const today = new Date();
        const localDateStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const orderTime = row[12] ? (() => { const p = new Date(row[12]); return isNaN(p.getTime()) ? '' : localDateStr(p); })() : '';

        if (orderPlace === 'Yes') return;
        // if (orderTime === localDateStr(today)) return;
        if (orderTime && orderTime !== localDateStr(today)) return;

        console.log({
            orderTime,
            today: localDateStr(today),
            willReturn: orderTime === localDateStr(today),
        });

        // Avoid ingesting duplicates based on a unique token column (row[2])
        try {
            const token = row[2];

            if (token) {
                const exists = await this.googleSheetModel.findOne({ token }).lean();
                if (exists) {
                    console.log('[GoogleSheetConsumer]: skipping duplicate token', token);
                    return;
                }
            }

            // Map row columns to explicit fields (indices are 0-based and follow the provided header order)
            const toDate = (v: any) => { const d = new Date(v); return isNaN(d.getTime()) ? null : d; };
            const toNumber = (v: any) => { if (v == null || v === '') return null; const n = Number(String(v).replace(/[^0-9.-]+/g, '')); return isNaN(n) ? null : n; };

            const payload: any = {
                row,
                sheetDate: sheetDate,
                status: 'pending',
                token: token,

                name: row[0] || null,
                phone: row[1] || null,
                amount: toNumber(row[3]),
                shopifyCustomerId: row[4] || null,
                product1: row[5] || null,
                address: row[6] || null,
                date: toDate(row[7]),
                time: row[8] || null,
                orderPlaced: row[9] || null,
                orderId: row[10] || null,
                orderName: row[11] || null,
                orderCreatedAt: toDate(row[12]),
                mobileNumber: row[13] || null,
                count: toNumber(row[14]),
                callingDate: toDate(row[15]),
                agentName: row[16] || null,
                finalConnected: row[17] || null,
                finalSellingPrice: toNumber(row[18]),
                finalMOP: toNumber(row[19]),
                finalOrderPlaced: row[20] || null,
                callingStatus: row[21] || null,
                finalRemark: row[22] || null,
                extraRemarks: row[23] || null,
                orderDate: toDate(row[24]),
                month: row[25] || null,
                churnCount: toNumber(row[26]),
                lastCallDate: toDate(row[27]),
                countType: row[28] || null,
                orderedMonth: row[29] || null,
                leadsMonth: row[30] || null,
                orderStatus: row[31] || null,
            };

            // const defaultData = {
            //     name: "John Doe",
            //     phone: "9999999999",
            //     amount: 0,
            //     shopifyCustomerId: "CUST001",
            //     product1: "Sample Product",
            //     address: "123 Main Street",
            //     date: new Date("2025-01-01"),
            //     time: "10:00 AM",
            //     orderPlaced: "No",
            //     orderId: "ORD001",
            //     orderName: "Order #001",
            //     orderCreatedAt: new Date("2025-01-01T10:00:00"),
            //     mobileNumber: "9999999999",
            //     count: 1,
            //     callingDate: new Date("2025-01-02"),
            //     agentName: "Agent A",
            //     finalConnected: "Yes",
            //     finalSellingPrice: 0,
            //     finalMOP: 0,
            //     finalOrderPlaced: "No",
            //     callingStatus: "Pending",
            //     finalRemark: "Follow up required",
            //     extraRemarks: "First call",
            //     orderDate: new Date("2025-01-01"),
            //     month: "January",
            //     churnCount: 0,
            //     lastCallDate: new Date("2025-01-02"),
            //     countType: "Lead",
            //     orderedMonth: "January",
            //     leadsMonth: "January",
            //     orderStatus: "Open",
            // };


            console.log('[GoogleSheetConsumer]: saving payload (token=%s, orderId=%s, name=%s)', token, payload.orderId, payload.name);
            const doc = await this.googleSheetModel.create(payload);
            console.log('[GoogleSheetConsumer]: saved document id=%s', doc._id);
        } catch (err) {
            console.error('[GoogleSheetConsumer] Error saving to MongoDB:', err?.message || err);
            if (err?.errors) {
                console.error('[GoogleSheetConsumer] Validation errors:', JSON.stringify(err.errors));
            }
            console.error(err?.stack || 'no stack');
        }
    }
}
