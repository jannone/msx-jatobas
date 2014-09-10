10 SCREEN 2: COLOR 15: MX=8: CN=0
11 DIM SX(30), SY(30), SV(30)
12 DIM ET(MX), EX(MX), EY(MX), EC(I), VX(MX), VY(MX)
13 FOR I=0 TO 30: SX(I) = INT(RND * 255): SY(I) = INT(RND * 191): SV(I) = INT(1 + RND * 2):NEXT
70 GOSUB 1000
80 X=28:Y=96
90 PUT SPRITE 0,(X-8,Y-8),15,0
100 A=STICK(0)
110 IF A=1 OR A=2 OR A=8 THEN Y=Y-1
120 IF A=2 OR A=3 OR A=4 THEN X=X+1
130 IF A=4 OR A=5 OR A=6 THEN Y=Y+1
140 IF A=6 OR A=7 OR A=8 THEN X=X-1
144 CN=(CN+1) MOD 16:IF CN=0 AND INT(RND * 3) = 1 THEN GOSUB 6000
145 IF STRIG(0) THEN GOSUB 8000
149 GOSUB 2000: GOSUB 4000: GOSUB 5000
150 SLEEP 1:GOTO 90
1000 ' --- Slot 0
1010 ' color 15
1020 DATA 00,00,00,00,C0,E6,FF,FF,3F,1F,07,1E,00,00,00,00
1030 DATA 00,00,00,00,00,00,F0,8C,FF,F0,80,00,00,00,00,00
1040 '
1050 ' --- Slot 1
1060 ' color 8
1070 DATA 00,00,00,00,00,00,01,03,03,01,00,00,00,00,00,00
1080 DATA 00,00,00,00,00,00,80,C0,C0,80,00,00,00,00,00,00
1090 '
1100 ' --- Slot 2
1110 ' color 12
1120 DATA 00,1F,27,53,52,66,3C,00,0F,0F,08,00,00,7F,00,00
1130 DATA 00,00,C0,FC,60,38,20,20,FE,FE,22,60,E0,C0,00,00
1140 ' --- Slot 3
1150 ' color 11
1160 DATA 00,04,22,07,03,2D,17,17,8F,1B,2F,05,47,0A,00,08
1170 DATA 20,00,88,61,B0,CC,F8,B5,F8,EE,F4,70,D2,A0,08,80
1500 FOR S=0 TO 3: D$="": FOR I=0 TO 31: READ V$: D$=D$+CHR$(VAL("&H"+V$)): NEXT: SPRITE$(S)=D$: NEXT
1510 RETURN
2000 FOR I=0 TO 30: PSET(SX(I), SY(I)), 1
2010 SX(I) = SX(I) - SV(I): IF SX(I) < 0 THEN SX(I) = 255: SY(I) = INT(RND * 191): SV(I) = INT(1 + RND * 2)
2020 PSET(SX(I), SY(I)), 15: NEXT
2030 RETURN
3000 ' --- Find empty entity
3010 I=0
3020 IF ET(I)=0 THEN RETURN
3030 I=I+1: IF I=MX THEN I=-1:RETURN
3040 GOTO 3020
4000 '--- Move entities
4010 FOR P=0 TO MX: IF ET(P)=0 THEN 4030
4020 EX(P)=EX(P)+VX(P):EY(P)=EY(P)+VY(P):IF EX(P) <= 0 OR EY(P) < 0 OR EY(P) > 191 THEN ET(P)=0
4021 IF ET(P)=3 THEN IF EC(P)>8 THEN EC(P)=EC(P)-1 ELSE ET(P)=0
4022 IF ET(P)=2 AND CN MOD 64=0 AND ABS(EX(P)-X)<50 THEN BX=EX(P):BY=EY(P):GOSUB 7000
4023 GOSUB 9000
4030 NEXT
4040 RETURN
5000 '--- Show entities
5010 FOR I=0 TO MX: IF ET(I)=0 THEN EC(I)=0
5020 PUT SPRITE I+1, (EX(I)-8, EY(I)-8), EC(I), ET(I)
5030 NEXT
5040 RETURN
6000 '--- Create random enemy
6010 GOSUB 3000
6020 IF I=-1 THEN RETURN
6030 ET(I)=2: EC(I)=12: EX(I)=255: EY(I)=INT(RND * 173) + 8: VX(I)=-2: VY(I)=0
6040 RETURN
7000 '--- Create bullet
7010 GOSUB 3000
7020 IF I=-1 THEN RETURN
7030 DD=SQR((BX-X)*(BX-X)+(BY-Y)*(BY-Y))
7040 VX(I)=(X-BX)*2/DD: VY(I)=(Y-BY)*2/DD: IF VY=0 AND (VX=-1 OR VX=0) THEN VX=-2
7050 ET(I)=1: EC(I)=8: EX(I)=BX: EY(I)=BY
7060 RETURN
8000 '--- Shoot
8010 LX=X:LY=Y:LINE(LX,LY)-(255,LY),7:SLEEP 1
8020 FOR P=0 TO MX: IF ET(P)<>2 THEN 8040
8030 IF EX(P)>LX+8 AND EY(P)>LY-8 AND EY(P)<LY+8 THEN ET(P)=3:EC(P)=11:VX(P)=0
8040 NEXT
8050 LINE(LX,Y)-(255,LY),1
8060 RETURN
9000 '--- Check collision
9010 IF ET(P)<>1 AND ET(P)<>2 THEN 9050
9020 DD=SQR((EX(P)-X)*(EX(P)-X)+(EY(P)-Y)*(EY(P)-Y))
9030 IF ET(P)=1 AND DD>5 THEN 9050
9035 IF ET(P)=2 AND DD>14 THEN 9050
9040 GOSUB 10000
9050 RETURN
10000 '--- Game over
10010 FOR P=0 TO MX+1: PUT SPRITE P,(0,0),0,0: NEXT
10020 COLOR 7: GRP(128-15*4, 92),"G A M E  O V E R": END
