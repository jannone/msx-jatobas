100 INPUT "Gravitational Field Mass (try 1000) "; M
130 IF M < 0 THEN 100
140 DIM A(255):FOR X=0 TO 255:A(X)=200:NEXT
145 SCREEN 2
150 D=0:FOR Y=0 TO 110 STEP 5:Y1=Y
160 FOR X=0 TO 130:X1=X:GOSUB 200:NEXT X:D=D+.75
170 FOR K=Y+1 TO Y+4:Y1=K:FOR X=0 TO 130 STEP 5:X1=X:GOSUB 200:NEXT X:D=D+.75:NEXT K,Y
180 Y=Y+1:FOR X=0 TO 130:X1=X:GOSUB 200:NEXT X
190 END
200 XF=(X1-65)/10:YF=(Y1-60)/8
210 IF XF=0 AND YF=0 THEN RETURN
220 Z=M/(XF*XF+YF*YF):ZT=Z-Y1+150
230 IF ZT>A(16+X1+D) THEN RETURN
240 PSET (16+X1+D,ZT),2+(Z MOD 14):A(16+X1+D)=ZT:RETURN
